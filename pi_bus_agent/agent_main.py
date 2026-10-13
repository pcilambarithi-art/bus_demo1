import os
import sys
import time
import signal
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from .config import AgentConfig
from .local_queue import LocalEventQueue
from .gps_reader import NEO6MSerialReader
from .announcement_player import CabinAnnouncementEngine
from .attendance_reader import AttendanceScannerHandler
from .sync_client import BusAgentSyncClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dce_pi_agent.main")


def read_pi_cpu_temperature() -> float:
    """Reads Raspberry Pi 5 SoC thermal sensor on Linux, or returns nominal 42.5C fallback."""
    thermal_file = Path("/sys/class/thermal/thermal_zone0/temp")
    if thermal_file.exists():
        try:
            milli_c = int(thermal_file.read_text().strip())
            return round(milli_c / 1000.0, 1)
        except Exception:
            pass
    return 42.5


class RaspberryPiBusAgent:
    """
    Main Autonomous Bus Daemon for Raspberry Pi 5.
    Coordinates NEO-6M serial GPS acquisition, offline stop announcements,
    RFID/QR student attendance queuing, and 4G cellular synchronization.
    """

    def __init__(
        self,
        config: Optional[AgentConfig] = None,
        route_stops: Optional[List[Dict[str, Any]]] = None,
        http_client: Optional[Any] = None,
        dry_run_audio: bool = False
    ):
        self.config = config or AgentConfig()
        self.queue = LocalEventQueue(
            db_path=self.config.local_db_path,
            device_id=self.config.device_id,
            bus_id=self.config.bus_id,
            route_id=self.config.route_id
        )
        self.gps_reader = NEO6MSerialReader(
            port=self.config.gps_serial_port,
            baud_rate=self.config.gps_baud_rate
        )
        self.announcer = CabinAnnouncementEngine(
            stops=route_stops or [],
            approaching_radius_m=self.config.geofence_approaching_m,
            arrival_radius_m=self.config.geofence_arrival_m,
            departure_hysteresis_m=self.config.geofence_departure_hysteresis_m,
            cooldown_sec=self.config.announcement_cooldown_sec,
            audio_device=self.config.audio_device,
            audio_clips_dir=self.config.audio_clips_dir,
            queue=self.queue,
            dry_run_audio=dry_run_audio
        )
        self.attendance_scanner = AttendanceScannerHandler(queue=self.queue, debounce_seconds=60)
        self.sync_client = BusAgentSyncClient(
            config=self.config,
            queue=self.queue,
            http_client=http_client
        )
        self.running = False
        self.last_heartbeat_ts = 0.0

    def get_service_status(self) -> Dict[str, Any]:
        """Returns comprehensive operational status and queue metrics for the Raspberry Pi bus agent."""
        q_stats = self.queue.get_queue_stats()
        recent_announcements = self.queue.get_played_announcements(limit=5)
        return {
            "deviceId": self.config.device_id,
            "busId": self.config.bus_id,
            "routeId": self.config.route_id,
            "mode": "SIMULATED_TEST_MODE" if self.config.test_mode else "PRODUCTION_HARDWARE_MODE",
            "gpsFixStatus": self.gps_reader.last_fix_status,
            "lastValidFix": self.gps_reader.last_valid_fix,
            "serverOnline": self.sync_client.server_online,
            "consecutiveSyncFailures": self.sync_client.consecutive_failures,
            "pendingGpsCount": q_stats["pendingGpsCount"],
            "pendingAttendanceCount": q_stats["pendingAttendanceCount"],
            "recentPlayedAnnouncements": recent_announcements
        }


    def process_gps_fix(self, fix: Dict[str, Any], force_offline: bool = False) -> Dict[str, Any]:
        """
        Processes a validated GPS fix:
        1. Evaluates local geofence and plays cabin speaker announcements immediately (even offline).
        2. Transmits live GPS over 4G or queues to local SQLite if offline.
        """
        lat = float(fix["latitude"])
        lng = float(fix["longitude"])
        spd = float(fix.get("speed_kmh", 0.0))
        hdg = float(fix.get("heading", 0.0))
        acc = float(fix.get("accuracy_m", 4.5))
        ts = int(fix.get("timestamp_ms") or (time.time() * 1000))

        # 1. Local Offline Cabin Speaker Evaluation
        announcements = self.announcer.evaluate_position(lat, lng, now_ts=ts / 1000.0)

        # 2. Live 4G Upload or Store-and-Forward Queue
        sync_res = self.sync_client.send_live_or_queue_gps(
            latitude=lat,
            longitude=lng,
            speed=spd,
            heading=hdg,
            accuracy=acc,
            timestamp_ms=ts,
            force_offline=force_offline
        )

        return {
            "fix": fix,
            "announcements": announcements,
            "sync": sync_res
        }

    def run_forever(self):
        self.running = True
        logger.info(
            f"Starting DCE Raspberry Pi 5 Bus Agent: device={self.config.device_id}, "
            f"bus={self.config.bus_id}, serial={self.config.gps_serial_port}"
        )

        def _stop_handler(signum, frame):
            logger.info("Received shutdown signal, stopping DCE Bus Agent cleanly...")
            self.running = False

        signal.signal(signal.SIGINT, _stop_handler)
        signal.signal(signal.SIGTERM, _stop_handler)

        while self.running:
            fix = self.gps_reader.read_fix()
            if fix and fix.get("fix_valid"):
                self.process_gps_fix(fix)

            # Flush any pending offline queue items if backoff timer permits
            if time.time() >= self.sync_client.next_retry_epoch:
                try:
                    self.sync_client.sync_pending_queues()
                except Exception as e:
                    logger.warning(f"Queue sync error: {e}")

            # Periodic hardware health heartbeat
            if (time.time() - self.last_heartbeat_ts) >= self.config.heartbeat_interval_sec:
                try:
                    self.sync_client.send_heartbeat(
                        gps_fix_status=self.gps_reader.last_fix_status,
                        cpu_temp_c=read_pi_cpu_temperature()
                    )
                    self.last_heartbeat_ts = time.time()
                except Exception as e:
                    logger.warning(f"Heartbeat upload deferred: {e}")

            time.sleep(self.config.gps_poll_interval_sec)


if __name__ == "__main__":
    agent = RaspberryPiBusAgent()
    agent.run_forever()
