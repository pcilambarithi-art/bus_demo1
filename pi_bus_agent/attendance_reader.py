import time
import logging
from typing import Optional, Dict, Any
from .local_queue import LocalEventQueue

logger = logging.getLogger("dce_pi_agent.attendance_reader")


class AttendanceScannerHandler:
    """
    Processes RFID card UIDs (13.56 MHz Mifare USB HID Reader) and 2D QR Optical Scanner strings.
    - Enforces local hardware debounce (default 60s) so holding a card on the reader does not
      flood the queue.
    - Immediately writes validated taps to the persistent SQLite LocalEventQueue so zero records
      are lost even if the 4G modem is disconnected.
    """

    def __init__(
        self,
        queue: LocalEventQueue,
        debounce_seconds: int = 60
    ):
        self.queue = queue
        self.debounce_seconds = debounce_seconds
        self.last_tap_map: Dict[str, float] = {} # key: f"{identifier}:{event_type}"

    def process_scan(
        self,
        raw_identifier: str,
        event_type: str = "BOARDING",
        current_stop_id: Optional[str] = None,
        current_stop_name: str = "On Route",
        now_ts: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Validates and queues an RFID/QR scan. Returns event metadata or None if debounced.
        """
        ident = (raw_identifier or "").strip()
        if not ident or len(ident) < 4:
            logger.warning(f"Rejected malformed RFID/QR scan input: '{raw_identifier}'")
            return None

        ev_type = (event_type or "BOARDING").upper()
        if ev_type not in ("BOARDING", "EXIT"):
            ev_type = "BOARDING"

        ts_sec = now_ts if now_ts is not None else time.time()
        debounce_key = f"{ident}:{ev_type}"
        last_seen = self.last_tap_map.get(debounce_key)

        if last_seen is not None and (ts_sec - last_seen) < self.debounce_seconds:
            logger.info(f"Debounced repeated tap for '{ident}' ({ev_type}) within {self.debounce_seconds}s")
            return None

        self.last_tap_map[debounce_key] = ts_sec
        ts_ms = int(ts_sec * 1000)

        event_id = self.queue.enqueue_attendance(
            student_identifier=ident,
            event_type=ev_type,
            stop_id=current_stop_id,
            stop_name=current_stop_name,
            timestamp_ms=ts_ms
        )

        logger.info(f"Queued {ev_type} scan for '{ident}' at '{current_stop_name}' -> eventId={event_id}")
        return {
            "eventId": event_id,
            "studentIdentifier": ident,
            "eventType": ev_type,
            "stopId": current_stop_id,
            "stopName": current_stop_name,
            "timestamp": ts_ms
        }
