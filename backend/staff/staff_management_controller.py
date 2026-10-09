import time
from datetime import datetime
from ..database.database_service import get_db, load_db, save_db
from ..security.password_hasher import hash_password
from ..admin.admin_activity_logger import log_activity

def handle_get_staff(helpers: dict) -> bool:
    load_db()
    db = get_db()
    staff = db.get("staff", [])
    return helpers["json"]({"success": True, "count": len(staff), "staff": staff})

def handle_create_staff(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    name = body.get("name")
    email = body.get("email")
    if not name or not email:
        return helpers["error"]("Staff name and email are required", 400)

    staff_list = db.setdefault("staff", [])
    new_staff = {
        "id": f"staff-{int(time.time() * 1000)}",
        "name": name,
        "email": email,
        "phone": body.get("phone") or "",
        "role": body.get("role") or "driver",
        "assignedBusId": body.get("assignedBusId") or "bus-07",
        "assignedRouteId": body.get("assignedRouteId") or "route-07",
        "passwordHash": hash_password(body.get("password") or "dce2024"),
        "status": "active",
        "lastActive": datetime.utcnow().isoformat() + "Z"
    }

    staff_list.append(new_staff)
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "STAFF_REGISTERED", new_staff["name"], f"Registered new staff member {new_staff['name']} as {new_staff['role']}")

    return helpers["json"]({"success": True, "message": "Staff member added", "staff": new_staff})

def handle_update_staff(staff_id: str, body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    staff_list = db.get("staff", [])
    idx = next((i for i, s in enumerate(staff_list) if s.get("id") == staff_id), -1)
    if idx == -1:
        return helpers["error"]("Staff member not found", 404)

    updated = {**staff_list[idx], **body, "id": staff_id}
    if body.get("password"):
        updated["passwordHash"] = hash_password(body["password"])

    staff_list[idx] = updated
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "STAFF_UPDATED", updated.get("name", staff_id), f"Updated profile/assignment for staff {updated.get('name')}")

    return helpers["json"]({"success": True, "message": "Staff updated successfully", "staff": updated})
