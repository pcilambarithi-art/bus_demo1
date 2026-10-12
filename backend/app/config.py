import os
import sys
from pathlib import Path
from typing import List

# Ensure site-packages and project root are always on sys.path
_d_site_pkgs = Path("D:/Lib/site-packages")
if _d_site_pkgs.exists() and str(_d_site_pkgs) not in sys.path:
    sys.path.insert(0, str(_d_site_pkgs))

# Paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
LOGS_DIR = DATA_DIR / "logs"
DIST_DIR = PROJECT_ROOT / "dist"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "Dhanalakshmi College of Engineering Bus Tracker"
    VERSION: str = "2.5.0"
    API_PREFIX: str = "/api"
    
    # Server Binding
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    
    # Database
    DEFAULT_DB_PATH = DATA_DIR / "bus_tracker.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dce_bus_tracking_secure_jwt_secret_key_2026_super_safe")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")) # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "*",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    ]
    
    # Real GPS Tracking & Geofencing Parameters
    GPS_JITTER_MAX_SPEED_KMH: float = float(os.getenv("GPS_JITTER_MAX_SPEED_KMH", "150.0"))
    GEOFENCE_STATION_RADIUS_METERS: int = int(os.getenv("GEOFENCE_STATION_RADIUS_METERS", "60"))
    GEOFENCE_APPROACH_RADIUS_METERS: int = int(os.getenv("GEOFENCE_APPROACH_RADIUS_METERS", "450"))
    GEOFENCE_DESTINATION_RADIUS_METERS: int = int(os.getenv("GEOFENCE_DESTINATION_RADIUS_METERS", "120"))
    GPS_STALE_THRESHOLD_SECONDS: int = int(os.getenv("GPS_STALE_THRESHOLD_SECONDS", "45"))
    GPS_OFFLINE_THRESHOLD_SECONDS: int = int(os.getenv("GPS_OFFLINE_THRESHOLD_SECONDS", "90"))
    
    # History Retention
    GPS_HISTORY_RETENTION_DAYS: int = int(os.getenv("GPS_HISTORY_RETENTION_DAYS", "30"))

settings = Settings()
