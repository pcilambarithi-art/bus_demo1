from datetime import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db, check_all_databases_health
from ..models.bus import Bus
from ..config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    """Health check validating FastAPI engine and all 6 logical databases."""
    db_ok = True
    db_error = None
    bus_count = 0
    multi_db_report = {}
    try:
        db.execute(text("SELECT 1"))
        bus_count = db.query(Bus).count()
        multi_db_report = check_all_databases_health()
        db_ok = multi_db_report.get("allConnected", True)
    except Exception as e:
        db_ok = False
        db_error = str(e)

    engine_type = "MySQL 8.x" if "mysql" in settings.DCE_TRACKING_DB_URL else "SQLite"
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": {
            "connected": db_ok,
            "type": engine_type,
            "architecture": "Six-Database Modular Isolation",
            "logicalDatabases": multi_db_report.get("databases", {}),
            "activeBuses": bus_count,
            "error": db_error
        },
        "serverTimeUtc": datetime.utcnow().isoformat() + "Z"
    }


@router.post("/health/databases/check")
def check_databases_live():
    """Live trigger to verify connectivity and latency across all modular databases."""
    report = check_all_databases_health()
    return {
        "success": True,
        "allConnected": report.get("allConnected", True),
        "databases": report.get("databases", {}),
        "checkedAt": datetime.utcnow().isoformat() + "Z"
    }

