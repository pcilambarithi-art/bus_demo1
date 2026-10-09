import time
from datetime import datetime
from ..database.database_service import get_db, load_db, save_db
from ..admin.admin_activity_logger import log_activity

def handle_get_announcements(helpers: dict) -> bool:
    load_db()
    db = get_db()
    announcements = db.get("voice_announcements", [])
    return helpers["json"]({"success": True, "count": len(announcements), "announcements": announcements})

def handle_create_announcement(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    text = body.get("text") or body.get("message")
    if not text:
        return helpers["error"]("Announcement text is required", 400)

    new_id = body.get("id") or f"va-{int(time.time() * 1000)}"
    new_announcement = {
        "id": new_id,
        "routeId": body.get("routeId") or "route-07",
        "stopId": body.get("stopId") or "stop-07-3",
        "stopName": body.get("stopName") or "Assigned Stop",
        "text": text,
        "textTamil": body.get("textTamil") or "",
        "language": body.get("language") or "en-IN",
        "audioUrl": body.get("audioUrl") or "",
        "triggerDistanceMeters": int(body.get("triggerDistanceMeters") or 300),
        "isActive": bool(body.get("isActive", True)),
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }

    announcements = db.setdefault("voice_announcements", [])
    announcements.append(new_announcement)
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "ANNOUNCEMENT_ADDED", new_announcement["stopName"], f"Configured voice announcement for {new_announcement['stopName']}: \"{new_announcement['text'][:40]}...\"")

    return helpers["json"]({"success": True, "message": "Voice announcement configured successfully", "announcement": new_announcement})

def handle_update_announcement(announcement_id: str, body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    announcements = db.get("voice_announcements", [])
    idx = next((i for i, v in enumerate(announcements) if v.get("id") == announcement_id), -1)
    if idx == -1:
        return helpers["error"](f"Announcement with ID '{announcement_id}' not found", 404)

    updated = {**announcements[idx], **body, "id": announcement_id}
    announcements[idx] = updated
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "ANNOUNCEMENT_UPDATED", updated.get("stopName", announcement_id), f"Modified voice announcement for {updated.get('stopName')}")

    return helpers["json"]({"success": True, "message": "Voice announcement updated", "announcement": updated})

def handle_delete_announcement(announcement_id: str, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    announcements = db.get("voice_announcements", [])
    idx = next((i for i, v in enumerate(announcements) if v.get("id") == announcement_id), -1)
    if idx == -1:
        return helpers["error"]("Announcement not found", 404)

    removed = announcements.pop(idx)
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "ANNOUNCEMENT_DELETED", removed.get("stopName", announcement_id), f"Deleted announcement for {removed.get('stopName')}")

    return helpers["json"]({"success": True, "message": "Announcement removed successfully"})
