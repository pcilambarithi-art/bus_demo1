import time
import random
import logging
from typing import Optional, Dict, Any
import httpx

from .config import AgentConfig
from .local_queue import LocalEventQueue

logger = logging.getLogger("dce_pi_agent.sync_client")


class BusAgentSyncClient:
    """
    Resilient 4G LTE Synchronization Client for the Raspberry Pi 5 Bus Agent.
    - Authenticates every request using unique per-device credentials (X-Device-Id & X-Device-Key).
    - Validates server TLS certificates in production.
    - Applies exponential backoff with jitter during cellular dead-zones.
    - Purges local SQLite queue entries strictly after receiving explicit server acknowledgements.
    """

    def __init__(
        self,
        config: AgentConfig,
        queue: LocalEventQueue,
        http_client: Optional[Any] = None
    ):
        self.config = config
        self.queue = queue
        self.http_client = http_client

        self.consecutive_failures = 0
        self.next_retry_epoch = 0.0
        self.last_successful_sync_epoch: Optional[float] = None
        self.server_online = False

    def _headers(self) -> Dict[str, str]:
        return {
            "X-Device-Id": self.config.device_id,
            "X-Device-Key": self.config.device_api_key,
            "Content-Type": "application/json"
        }

    def _compute_backoff_seconds(self) -> float:
        base = min(self.config.max_backoff_sec, (2 ** min(self.consecutive_failures, 7)))
        jitter = random.uniform(0.0, 0.25 * base)
        return round(min(self.config.max_backoff_sec, base + jitter), 2)

    def _record_success(self):
        self.consecutive_failures = 0
        self.next_retry_epoch = 0.0
        self.last_successful_sync_epoch = time.time()
        self.server_online = True

    def _record_failure(self, err_msg: str):
        self.consecutive_failures += 1
        backoff = self._compute_backoff_seconds()
        self.next_retry_epoch = time.time() + backoff
        self.server_online = False
        logger.warning(
            f"[{self.config.device_id}] 4G Sync failure #{self.consecutive_failures}: {err_msg}. "
            f"Backing off for {backoff}s"
        )

    def _post(self, endpoint_path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.config.server_base_url}{endpoint_path}"
        if self.http_client is not None:
            # Supports FastAPI TestClient or custom injected httpx.Client
            resp = self.http_client.post(
                endpoint_path if hasattr(self.http_client, "app") else url,
                json=payload,
                headers=self._headers()
            )
        else:
            verify_opt: Any = self.config.ca_bundle_path if self.config.ca_bundle_path else self.config.verify_tls
            with httpx.Client(verify=verify_opt, timeout=10.0) as client:
                resp = client.post(url, json=payload, headers=self._headers())

        if resp.status_code in (401, 403):
            raise PermissionError(f"HTTP {resp.status_code}: {resp.text}")
        if resp.status_code >= 400:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text}")
        return resp.json()

    def send_live_or_queue_gps(
        self,
        latitude: float,
        longitude: float,
        speed: float = 0.0,
        heading: float = 0.0,
        accuracy: float = 4.5,
        timestamp_ms: Optional[int] = None,
        force_offline: bool = False
    ) -> Dict[str, Any]:
        """
        Attempts to transmit a real-time GPS coordinate over 4G.
        If the network is down or in backoff, stores the fix in the persistent SQLite queue.
        """
        ts = timestamp_ms or int(time.time() * 1000)

        if force_offline or time.time() < self.next_retry_epoch:
            ev_id = self.queue.enqueue_gps(latitude, longitude, speed, heading, accuracy, ts)
            return {"mode": "QUEUED_OFFLINE", "eventId": ev_id}

        payload = {
            "busId": self.config.bus_id,
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "heading": heading,
            "accuracy": accuracy,
            "timestamp": ts,
            "isSimulated": False
        }
        try:
            data = self._post("/api/driver/telemetry", payload)
            self._record_success()
            return {"mode": "LIVE_SENT", "response": data}
        except PermissionError:
            # Auth/Assignment error should not be silently swallowed
            raise
        except Exception as e:
            ev_id = self.queue.enqueue_gps(latitude, longitude, speed, heading, accuracy, ts)
            self._record_failure(str(e))
            return {"mode": "QUEUED_AFTER_ERROR", "eventId": ev_id, "error": str(e)}

    def sync_pending_queues(self, batch_limit: int = 50) -> Dict[str, Any]:
        """
        Flushes pending GPS and Attendance records from the local SQLite store-and-forward queue
        to the central FastAPI server. Deletes local records ONLY after server acknowledgement.
        """
        gps_Synced = 0
        att_Synced = 0

        # 1. Flush Pending GPS Points
        pending_gps = self.queue.get_pending_gps(limit=batch_limit)
        if pending_gps:
            points_payload = [
                {
                    "eventId": row["event_id"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "speed": row["speed"],
                    "heading": row["heading"],
                    "accuracy": row["accuracy"],
                    "timestamp": row["timestamp"]
                }
                for row in pending_gps
            ]
            try:
                res = self._post("/api/devices/gps-batch", {
                    "deviceId": self.config.device_id,
                    "busId": self.config.bus_id,
                    "points": points_payload
                })
                ack_ids = res.get("acknowledgedEventIds", [])
                if ack_ids:
                    self.queue.acknowledge_gps(ack_ids)
                    gps_Synced = len(ack_ids)
                self._record_success()
            except PermissionError:
                raise
            except Exception as e:
                self.queue.record_retry_failure("pending_gps", [r["event_id"] for r in pending_gps], str(e))
                self._record_failure(str(e))
                return {"success": False, "error": str(e), "gpsSynced": 0, "attendanceSynced": 0}

        # 2. Flush Pending Student Attendance Records
        pending_att = self.queue.get_pending_attendance(limit=batch_limit)
        if pending_att:
            records_payload = [
                {
                    "eventId": row["event_id"],
                    "studentIdentifier": row["student_identifier"],
                    "busId": row["bus_id"],
                    "routeId": row["route_id"],
                    "stopId": row["stop_id"],
                    "stopName": row["stop_name"],
                    "eventType": row["event_type"],
                    "deviceId": row["device_id"],
                    "timestamp": row["timestamp"],
                    "syncStatus": "OFFLINE_SYNCED"
                }
                for row in pending_att
            ]
            try:
                res = self._post("/api/attendance/batch", {
                    "deviceId": self.config.device_id,
                    "busId": self.config.bus_id,
                    "records": records_payload
                })
                ack_ids = res.get("acknowledgedEventIds", [])
                if ack_ids:
                    self.queue.acknowledge_attendance(ack_ids)
                    att_Synced = len(ack_ids)
                self._record_success()
            except PermissionError:
                raise
            except Exception as e:
                self.queue.record_retry_failure("pending_attendance", [r["event_id"] for r in pending_att], str(e))
                self._record_failure(str(e))
                return {"success": False, "error": str(e), "gpsSynced": gps_Synced, "attendanceSynced": 0}

        return {
            "success": True,
            "gpsSynced": gps_Synced,
            "attendanceSynced": att_Synced,
            "remaining": self.queue.get_queue_stats()
        }

    def send_heartbeat(
        self,
        gps_fix_status: str = "3D_FIX",
        signal_csq: int = 25,
        battery_voltage: float = 13.8,
        cpu_temp_c: float = 43.0
    ) -> Dict[str, Any]:
        stats = self.queue.get_queue_stats()
        payload = {
            "deviceId": self.config.device_id,
            "busId": self.config.bus_id,
            "firmwareVersion": "1.2.0",
            "modemModel": "Huawei E3372h 4G LTE",
            "signalCsq": signal_csq,
            "gpsFixStatus": gps_fix_status,
            "batteryVoltage": battery_voltage,
            "cpuTempC": cpu_temp_c,
            "pendingGpsCount": stats["pendingGpsCount"],
            "pendingAttendanceCount": stats["pendingAttendanceCount"]
        }
        res = self._post("/api/devices/heartbeat", payload)
        self._record_success()
        return res
