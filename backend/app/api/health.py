from datetime import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..models.bus import Bus
from ..config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    """Health check validating FastAPI engine and SQLite database connectivity."""
    db_ok = True
    db_error = None
    bus_count = 0
    try:
        db.execute(text("SELECT 1"))
        bus_count = db.query(Bus).count()
    except Exception as e:
        db_ok = False
        db_error = str(e)

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": {
            "connected": db_ok,
            "type": "SQLite",
            "activeBuses": bus_count,
            "error": db_error
        },
        "serverTimeUtc": datetime.utcnow().isoformat() + "Z"
    }
