import os
from pathlib import Path
from dataclasses import dataclass

@dataclass
class AgentConfig:
    """
    Configuration for the Raspberry Pi 5 Bus Agent.
    All secrets (DCE_DEVICE_API_KEY) are loaded strictly from environment variables
    or /etc/dce-bus-agent/agent.env (chmod 600) — never hardcoded in source code.
    """
    device_id: str = os.getenv("DCE_DEVICE_ID", "pi-bus-07")
    bus_id: str = os.getenv("DCE_BUS_ID", "bus-07")
    route_id: str = os.getenv("DCE_ROUTE_ID", "route-07")
    device_api_key: str = os.getenv("DCE_DEVICE_API_KEY", "")

    # Central FastAPI Server URL (HTTPS in production over 4G LTE)
    server_base_url: str = os.getenv("DCE_SERVER_URL", "https://transit.dce.edu.in").rstrip("/")
    verify_tls: bool = os.getenv("DCE_VERIFY_TLS", "true").lower() in ("true", "1", "yes")
    ca_bundle_path: str = os.getenv("DCE_CA_BUNDLE_PATH", "")

    # NEO-6M (MP510_GPS_V02_WWXL) UART Configuration on Raspberry Pi 5
    # Pi 5 GPIO 14 (TXD0 / Pin 8) & GPIO 15 (RXD0 / Pin 10) map to /dev/ttyAMA0
    gps_serial_port: str = os.getenv("DCE_GPS_PORT", "/dev/ttyAMA0")
    gps_baud_rate: int = int(os.getenv("DCE_GPS_BAUD", "9600"))
    gps_poll_interval_sec: float = float(os.getenv("DCE_GPS_INTERVAL_SEC", "2.0"))

    # Persistent Store-and-Forward SQLite Queue Path
    local_db_path: str = os.getenv(
        "DCE_LOCAL_QUEUE_DB",
        str(Path(__file__).resolve().parent / "data" / f"queue_{os.getenv('DCE_DEVICE_ID', 'pi-bus-07')}.db")
    )

    # USB Audio DAC & Offline Cabin Speaker Settings (Pi 5 has no 3.5mm jack)
    audio_device: str = os.getenv("DCE_AUDIO_DEVICE", "plughw:1,0")
    audio_clips_dir: str = os.getenv(
        "DCE_AUDIO_CLIPS_DIR",
        str(Path(__file__).resolve().parent / "audio_clips")
    )
    announcement_cooldown_sec: int = int(os.getenv("DCE_ANNOUNCEMENT_COOLDOWN_SEC", "180"))
    geofence_approaching_m: float = float(os.getenv("DCE_GEOFENCE_APPROACHING_M", "350.0"))
    geofence_arrival_m: float = float(os.getenv("DCE_GEOFENCE_ARRIVAL_M", "80.0"))
    geofence_departure_hysteresis_m: float = float(os.getenv("DCE_GEOFENCE_DEPARTURE_M", "135.0"))

    # Exponential Backoff Limits for 4G Reconnection
    sync_interval_sec: float = float(os.getenv("DCE_SYNC_INTERVAL_SEC", "3.0"))
    max_backoff_sec: float = float(os.getenv("DCE_MAX_BACKOFF_SEC", "120.0"))
    heartbeat_interval_sec: float = float(os.getenv("DCE_HEARTBEAT_INTERVAL_SEC", "30.0"))

    # Explicit test mode flag (production default is strictly False)
    test_mode: bool = os.getenv("DCE_TEST_MODE", "false").lower() in ("true", "1", "yes")
