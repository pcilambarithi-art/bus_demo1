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
BACKUPS_DIR = DATA_DIR / "backups"
DIST_DIR = PROJECT_ROOT / "dist"

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

# Load .env from project root if present without overriding explicit os.environ variables
_env_path = PROJECT_ROOT / ".env"
if _env_path.exists():
    with open(_env_path, "r", encoding="utf-8") as _ef:
        for _line in _ef:
            _line = _line.strip()
            if not _line or _line.startswith("#") or "=" not in _line:
                continue
            _k, _v = _line.split("=", 1)
            _k = _k.strip()
            _v = _v.strip().strip('"').strip("'")
            if _k and _k not in os.environ:
                os.environ[_k] = _v


class Settings:
    PROJECT_NAME: str = "Dhanalakshmi College of Engineering Bus Tracker"
    VERSION: str = "3.0.0"
    API_PREFIX: str = "/api"

    # Server Binding
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "5000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

    # Legacy SQLite fallback path + Six-Database Architecture
    DEFAULT_DB_PATH = DATA_DIR / "bus_tracker.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
    DCE_DB_MODE: str = os.getenv("DCE_DB_MODE", "mysql")

    # 1. Identity & Access Database (dce_identity_db)
    DCE_IDENTITY_DB_URL: str = os.getenv(
        "DCE_IDENTITY_DB_URL",
        f"sqlite:///{(DATA_DIR / 'dce_identity.db').as_posix()}"
    )
    # 2. Student Profile Database (dce_student_db)
    DCE_STUDENT_DB_URL: str = os.getenv(
        "DCE_STUDENT_DB_URL",
        f"sqlite:///{(DATA_DIR / 'dce_student.db').as_posix()}"
    )
    # 3. Bus Tracking & GPS Database (dce_bus_tracking_db)
    DCE_TRACKING_DB_URL: str = os.getenv(
        "DCE_TRACKING_DB_URL",
        f"sqlite:///{(DATA_DIR / 'dce_bus_tracking.db').as_posix()}"
    )
    # 4. Face & Biometric Attendance Database (dce_attendance_db)
    DCE_ATTENDANCE_DB_URL: str = os.getenv(
        "DCE_ATTENDANCE_DB_URL",
        f"sqlite:///{(DATA_DIR / 'dce_attendance.db').as_posix()}"
    )
    # 5. Notifications & Announcements Database (dce_notifications_db)
    DCE_NOTIFICATIONS_DB_URL: str = os.getenv(
        "DCE_NOTIFICATIONS_DB_URL",
        f"sqlite:///{(DATA_DIR / 'dce_notifications.db').as_posix()}"
    )
    # 6. Security & Admin Audit Database (dce_audit_db)
    DCE_AUDIT_DB_URL: str = os.getenv(
        "DCE_AUDIT_DB_URL",
        f"sqlite:///{(DATA_DIR / 'dce_audit.db').as_posix()}"
    )

    # Security & Biometric Encryption Secrets
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dce_bus_tracking_secure_jwt_secret_key_2026_super_safe")
    FACE_TEMPLATE_ENCRYPTION_KEY: str = os.getenv(
        "FACE_TEMPLATE_ENCRYPTION_KEY",
        "dce_biometric_template_encryption_master_key_2026_v1"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    PASSWORD_PBKDF2_ITERATIONS: int = int(os.getenv("PASSWORD_PBKDF2_ITERATIONS", "600000"))

    # Face Attendance & Liveness Quality Thresholds
    FACE_MATCH_SIMILARITY_THRESHOLD: float = float(os.getenv("FACE_MATCH_SIMILARITY_THRESHOLD", "0.82"))
    FACE_MIN_BRIGHTNESS: float = float(os.getenv("FACE_MIN_BRIGHTNESS", "35.0"))
    FACE_MAX_BRIGHTNESS: float = float(os.getenv("FACE_MAX_BRIGHTNESS", "235.0"))
    FACE_MIN_SHARPNESS: float = float(os.getenv("FACE_MIN_SHARPNESS", "12.0"))
    FACE_MIN_LIVENESS_SCORE: float = float(os.getenv("FACE_MIN_LIVENESS_SCORE", "0.65"))
    FACE_MAX_IMAGE_BYTES: int = int(os.getenv("FACE_MAX_IMAGE_BYTES", str(5 * 1024 * 1024)))  # 5 MB

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
