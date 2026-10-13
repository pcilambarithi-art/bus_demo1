import os
import math
import time
import shutil
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger("dce_pi_agent.announcements")


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Computes great-circle distance in meters between two WGS84 coordinates."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(d_lam / 2.0) ** 2)
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class CabinAnnouncementEngine:
    """
    Offline Bus Stop Announcement Engine for Raspberry Pi 5.
    - Uses geofence hysteresis (Arrival <= 80m, Departure >= 135m) to prevent GPS drift chatter.
    - Enforces per-stop event cooldowns (default 180s) to prevent duplicate announcements.
    - Outputs audio via USB Audio DAC (aplay / espeak-ng) since Raspberry Pi 5 has no 3.5mm jack.
    - Continues operating seamlessly even during complete 4G network outages.
    """

    def __init__(
        self,
        stops: List[Dict[str, Any]],
        approaching_radius_m: float = 350.0,
        arrival_radius_m: float = 80.0,
        departure_hysteresis_m: float = 135.0,
        cooldown_sec: int = 180,
        audio_device: str = "plughw:1,0",
        audio_clips_dir: str = "",
        dry_run_audio: bool = False
    ):
        self.stops = sorted(stops, key=lambda s: int(s.get("sequence", 1)))
        self.approaching_radius_m = approaching_radius_m
        self.arrival_radius_m = arrival_radius_m
        self.departure_hysteresis_m = departure_hysteresis_m
        self.cooldown_sec = cooldown_sec
        self.audio_device = audio_device
        self.audio_clips_dir = Path(audio_clips_dir) if audio_clips_dir else None
        self.dry_run_audio = dry_run_audio

        self.current_arrived_stop_id: Optional[str] = None
        self.last_announced_times: Dict[str, float] = {} # key: f"{stop_id}:{event_type}"
        self.history: List[Dict[str, Any]] = []

    def _can_announce(self, stop_id: str, event_type: str, now_ts: float) -> bool:
        key = f"{stop_id}:{event_type}"
        last_time = self.last_announced_times.get(key)
        if last_time is not None and (now_ts - last_time) < self.cooldown_sec:
            return False
        self.last_announced_times[key] = now_ts
        return True

    def _speak(self, text: str, stop_id: str, event_type: str):
        """
        Plays pre-recorded WAV clip if available, otherwise synthesizes speech offline via espeak-ng.
        """
        logger.info(f"[CABIN SPEAKER - {event_type}] {text}")
        if self.dry_run_audio:
            return

        # 1. Check for pre-recorded offline WAV clip
        if self.audio_clips_dir:
            wav_file = self.audio_clips_dir / f"{stop_id}_{event_type.lower()}.wav"
            if wav_file.exists() and shutil.which("aplay"):
                try:
                    subprocess.Popen(
                        ["aplay", "-D", self.audio_device, "-q", str(wav_file)],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                    return
                except Exception as e:
                    logger.warning(f"aplay failed: {e}")

        # 2. Fallback to offline espeak-ng TTS on Raspberry Pi OS
        if shutil.which("espeak-ng"):
            try:
                subprocess.Popen(
                    ["espeak-ng", "-v", "en-in", "-s", "145", text],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception as e:
                logger.warning(f"espeak-ng failed: {e}")

    def evaluate_position(
        self,
        latitude: float,
        longitude: float,
        now_ts: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates current GPS fix against ordered route stops and returns any triggered
        announcements (APPROACHING, ARRIVED, DEPARTED).
        """
        if not self.stops:
            return []

        ts = now_ts if now_ts is not None else time.time()
        triggered: List[Dict[str, Any]] = []

        # Compute distances to all stops
        distances = []
        for idx, st in enumerate(self.stops):
            dist = haversine_meters(latitude, longitude, float(st["lat"]), float(st["lng"]))
            distances.append((dist, idx, st))

        # 1. Check if we were previously ARRIVED at a stop and have now crossed the departure hysteresis radius
        if self.current_arrived_stop_id:
            active_tuple = next((item for item in distances if item[2]["id"] == self.current_arrived_stop_id), None)
            if active_tuple:
                dist_from_active, idx, active_stop = active_tuple
                if dist_from_active >= self.departure_hysteresis_m:
                    next_stop = self.stops[idx + 1] if (idx + 1) < len(self.stops) else None
                    if self._can_announce(active_stop["id"], "DEPARTED", ts):
                        next_phrase = f" Next stop is {next_stop['name']}." if next_stop else " Proceeding to destination."
                        msg = f"Departed from {active_stop['name']}.{next_phrase}"
                        self._speak(msg, active_stop["id"], "DEPARTED")
                        ev = {
                            "eventType": "DEPARTED",
                            "stopId": active_stop["id"],
                            "stopName": active_stop["name"],
                            "nextStopName": next_stop["name"] if next_stop else None,
                            "distanceMeters": round(dist_from_active, 1),
                            "text": msg,
                            "timestamp": int(ts * 1000)
                        }
                        triggered.append(ev)
                        self.history.append(ev)
                    self.current_arrived_stop_id = None

        # 2. Find closest stop
        closest_dist, closest_idx, closest_stop = min(distances, key=lambda x: x[0])
        stop_arrival_radius = float(closest_stop.get("geofenceRadius") or self.arrival_radius_m)

        # 3. Check ARRIVED state
        if closest_dist <= stop_arrival_radius:
            if self.current_arrived_stop_id != closest_stop["id"]:
                self.current_arrived_stop_id = closest_stop["id"]
                if self._can_announce(closest_stop["id"], "ARRIVED", ts):
                    msg = f"Arrived at {closest_stop['name']}. Please board or alight safely."
                    self._speak(msg, closest_stop["id"], "ARRIVED")
                    ev = {
                        "eventType": "ARRIVED",
                        "stopId": closest_stop["id"],
                        "stopName": closest_stop["name"],
                        "distanceMeters": round(closest_dist, 1),
                        "text": msg,
                        "timestamp": int(ts * 1000)
                    }
                    triggered.append(ev)
                    self.history.append(ev)

        # 4. Check APPROACHING state (outside arrival radius, within approaching radius)
        elif closest_dist <= self.approaching_radius_m and self.current_arrived_stop_id != closest_stop["id"]:
            if self._can_announce(closest_stop["id"], "APPROACHING", ts):
                msg = f"Approaching {closest_stop['name']} in {int(round(closest_dist))} meters."
                self._speak(msg, closest_stop["id"], "APPROACHING")
                ev = {
                    "eventType": "APPROACHING",
                    "stopId": closest_stop["id"],
                    "stopName": closest_stop["name"],
                    "distanceMeters": round(closest_dist, 1),
                    "text": msg,
                    "timestamp": int(ts * 1000)
                }
                triggered.append(ev)
                self.history.append(ev)

        return triggered
