import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.notification import NotificationRecord

logger = logging.getLogger("dce_transit.notifications")

def dispatch_station_notifications(
    db: Session,
    events: List[Dict[str, Any]]
) -> int:
    """
    Persists station arrival/departure event notifications to the database.
    """
    dispatched_count = 0
    for ev in events:
        try:
            notif = NotificationRecord(
                id=f"notif-{int(time.time()*1000)}-{dispatched_count}",
                recipient_role="all",
                bus_id=ev.get("bus_id"),
                event_id=ev.get("id"),
                title=ev.get("title", "Bus Alert"),
                message=ev.get("message", ""),
                channel="in_app",
                status="delivered",
                created_at=datetime.utcnow()
            )
            db.add(notif)
            dispatched_count += 1
        except Exception as e:
            logger.error(f"Error persisting notification: {e}")

    if dispatched_count > 0:
        db.commit()
    return dispatched_count
