import time
from datetime import datetime
from ..database.database_service import get_db, save_db

def log_activity(admin_id: str, admin_name: str, action: str, target: str, details: str):
    db = get_db()
    if "activity_logs" not in db:
        db["activity_logs"] = []

    log_entry = {
        "id": f"log-{int(time.time() * 1000)}",
        "adminId": admin_id or "admin-system",
        "adminName": admin_name or "Administrator",
        "action": action,
        "target": target,
        "details": details,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    db["activity_logs"].insert(0, log_entry)
    if len(db["activity_logs"]) > 200:
        db["activity_logs"] = db["activity_logs"][:200]
    save_db()

def handle_get_activity_logs():
    db = get_db()
    logs = db.get("activity_logs", [])
    return {"success": True, "count": len(logs), "logs": logs}
