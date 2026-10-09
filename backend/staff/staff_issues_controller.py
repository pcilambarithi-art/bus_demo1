import time
from datetime import datetime
from ..database.database_service import get_db, load_db, save_db
from ..admin.admin_activity_logger import log_activity

def handle_create_issue(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    bus_id = body.get("busId") or "bus-07"
    bus_number = body.get("busNumber") or "DCE-BUS-07"
    route_id = body.get("routeId") or "route-07"
    issue_type = body.get("issueType") or "Mechanical Problem"
    description = body.get("description") or "Issue reported by staff."
    location = body.get("location") or "On Route"
    priority = body.get("priority") or "Medium"
    photo_url = body.get("photoUrl") or ""

    lat = body.get("latitude")
    lng = body.get("longitude")

    new_issue = {
        "id": f"issue-{int(time.time() * 1000)}",
        "staffId": current_user.get("id") if current_user else "staff-01",
        "staffName": current_user.get("name") if current_user else "Bus Driver",
        "busId": bus_id,
        "busNumber": bus_number,
        "routeId": route_id,
        "issueType": issue_type,
        "description": description,
        "photoUrl": photo_url,
        "location": location,
        "latitude": float(lat) if lat is not None else None,
        "longitude": float(lng) if lng is not None else None,
        "priority": priority,
        "status": "New",
        "adminRemarks": "",
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "updatedAt": datetime.utcnow().isoformat() + "Z"
    }

    reports = db.setdefault("issue_reports", [])
    reports.insert(0, new_issue)
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "ISSUE_FILED", new_issue["busNumber"], f"Staff reported {new_issue['issueType']}: {new_issue['description'][:50]}")

    return helpers["json"]({"success": True, "message": "Issue reported to transport management", "issue": new_issue})

def handle_get_staff_issues(current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    staff_id = current_user.get("id") if current_user else None
    all_reports = db.get("issue_reports", [])
    if staff_id:
        reports = [r for r in all_reports if r.get("staffId") == staff_id]
    else:
        reports = all_reports
    return helpers["json"]({"success": True, "count": len(reports), "issues": reports})
