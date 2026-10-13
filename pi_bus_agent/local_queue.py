import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import List, Dict, Any, Optional


class LocalEventQueue:
    """
    Persistent SQLite Store-and-Forward Queue for the Raspberry Pi 5 Bus Agent.
    Buffers GPS coordinates and student RFID/QR attendance events locally on the SD/NVMe drive
    whenever 4G cellular connectivity is degraded or unreachable, and guarantees zero duplicate
    records via deterministic event IDs upon reconnection.
    """

    def __init__(self, db_path: str, device_id: str, bus_id: str, route_id: str):
        self.db_path = db_path
        self.device_id = device_id
        self.bus_id = bus_id
        self.route_id = route_id

        parent = Path(db_path).parent
        parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _get_conn(self):
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=DELETE;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            yield conn
        finally:
            conn.close()


    def _init_schema(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pending_gps (
                    event_id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    bus_id TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    speed REAL DEFAULT 0.0,
                    heading REAL DEFAULT 0.0,
                    accuracy REAL DEFAULT 4.5,
                    timestamp INTEGER NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT DEFAULT '',
                    created_at INTEGER NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pending_attendance (
                    event_id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    bus_id TEXT NOT NULL,
                    route_id TEXT NOT NULL,
                    student_identifier TEXT NOT NULL,
                    event_type TEXT DEFAULT 'BOARDING',
                    stop_id TEXT,
                    stop_name TEXT DEFAULT 'On Route',
                    timestamp INTEGER NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT DEFAULT '',
                    created_at INTEGER NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS played_announcements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_id TEXT NOT NULL,
                    bus_id TEXT NOT NULL,
                    stop_id TEXT NOT NULL,
                    stop_name TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    announcement_text TEXT NOT NULL,
                    language TEXT DEFAULT 'en-IN',
                    distance_meters REAL DEFAULT 0.0,
                    timestamp INTEGER NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_state (
                    state_key TEXT PRIMARY KEY,
                    state_value TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                )
            """)
            conn.commit()

    def enqueue_gps(
        self,
        latitude: float,
        longitude: float,
        speed: float = 0.0,
        heading: float = 0.0,
        accuracy: float = 4.5,
        timestamp_ms: Optional[int] = None
    ) -> str:
        ts = timestamp_ms or int(time.time() * 1000)
        event_id = f"gps-{self.device_id}-{ts}"
        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO pending_gps
                (event_id, device_id, bus_id, latitude, longitude, speed, heading, accuracy, timestamp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (event_id, self.device_id, self.bus_id, latitude, longitude, speed, heading, accuracy, ts, int(time.time() * 1000)))
            conn.commit()
        return event_id

    def enqueue_attendance(
        self,
        student_identifier: str,
        event_type: str = "BOARDING",
        stop_id: Optional[str] = None,
        stop_name: str = "On Route",
        timestamp_ms: Optional[int] = None
    ) -> str:
        ts = timestamp_ms or int(time.time() * 1000)
        clean_id = student_identifier.strip().replace(" ", "_")
        # Deterministic per-second bucket ID prevents duplicate local queuing
        bucket_sec = ts // 1000
        event_id = f"att-{self.bus_id}-{clean_id}-{event_type.lower()}-{bucket_sec}"
        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO pending_attendance
                (event_id, device_id, bus_id, route_id, student_identifier, event_type, stop_id, stop_name, timestamp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id,
                self.device_id,
                self.bus_id,
                self.route_id,
                student_identifier.strip(),
                event_type.upper(),
                stop_id,
                stop_name,
                ts,
                int(time.time() * 1000)
            ))
            conn.commit()
        return event_id

    def log_played_announcement(
        self,
        stop_id: str,
        stop_name: str,
        event_type: str,
        text: str,
        distance_meters: float = 0.0,
        language: str = "en-IN",
        timestamp_ms: Optional[int] = None
    ):
        ts = timestamp_ms or int(time.time() * 1000)
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO played_announcements
                (device_id, bus_id, stop_id, stop_name, event_type, announcement_text, language, distance_meters, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (self.device_id, self.bus_id, stop_id, stop_name, event_type, text, language, distance_meters, ts))
            conn.commit()

    def get_played_announcements(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM played_announcements
                ORDER BY timestamp DESC, id DESC
                LIMIT ?
            """, (limit,)).fetchall()
            return [dict(r) for r in rows]

    def set_state(self, key: str, value: str):
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO agent_state (state_key, state_value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value, updated_at = excluded.updated_at
            """, (key, value, int(time.time() * 1000)))
            conn.commit()

    def get_state(self, key: str) -> Optional[str]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT state_value FROM agent_state WHERE state_key = ?", (key,)).fetchone()
            return row["state_value"] if row else None

    def get_pending_gps(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM pending_gps
                ORDER BY timestamp ASC
                LIMIT ?
            """, (limit,)).fetchall()
            return [dict(r) for r in rows]

    def get_pending_attendance(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM pending_attendance
                ORDER BY timestamp ASC
                LIMIT ?
            """, (limit,)).fetchall()
            return [dict(r) for r in rows]

    def acknowledge_gps(self, event_ids: List[str]):
        if not event_ids:
            return
        placeholders = ",".join("?" for _ in event_ids)
        with self._get_conn() as conn:
            conn.execute(f"DELETE FROM pending_gps WHERE event_id IN ({placeholders})", event_ids)
            conn.commit()

    def acknowledge_attendance(self, event_ids: List[str]):
        if not event_ids:
            return
        placeholders = ",".join("?" for _ in event_ids)
        with self._get_conn() as conn:
            conn.execute(f"DELETE FROM pending_attendance WHERE event_id IN ({placeholders})", event_ids)
            conn.commit()

    def record_retry_failure(self, table: str, event_ids: List[str], error_msg: str):
        if not event_ids or table not in ("pending_gps", "pending_attendance"):
            return
        placeholders = ",".join("?" for _ in event_ids)
        with self._get_conn() as conn:
            conn.execute(
                f"UPDATE {table} SET retry_count = retry_count + 1, last_error = ? WHERE event_id IN ({placeholders})",
                [error_msg[:250]] + event_ids
            )
            conn.commit()

    def get_queue_stats(self) -> Dict[str, int]:
        with self._get_conn() as conn:
            gps_count = conn.execute("SELECT COUNT(*) FROM pending_gps").fetchone()[0]
            att_count = conn.execute("SELECT COUNT(*) FROM pending_attendance").fetchone()[0]
            return {
                "pendingGpsCount": gps_count,
                "pendingAttendanceCount": att_count
            }

