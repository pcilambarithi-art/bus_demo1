from datetime import datetime
from ..database.database_service import get_db, save_db, load_db
from .admin_activity_logger import log_activity

def handle_get_admin_issues():
    load_db()
    db = get_db()
    issues = db.get("issue_reports", [])
    return {"success": True, "count": len(issues), "issues": issues}

def handle_update_issue(issue_id: str, body: dict, current_user: dict):
    load_db()
    db = get_db()
    reports = db.get("issue_reports", [])
    
    match_index = -1
    for idx, r in enumerate(reports):
        if r.get("id") == issue_id:
            match_index = idx
            break

    if match_index == -1:
        return {"error": "Issue report not found", "success": False}, 404

    status = body.get("status")
    admin_remarks = body.get("adminRemarks")

    if status:
        reports[match_index]["status"] = status
    if admin_remarks is not None:
        reports[match_index]["adminRemarks"] = admin_remarks
    reports[match_index]["updatedAt"] = datetime.utcnow().isoformat() + "Z"

    save_db()
    log_activity(
        current_user.get("id") if current_user else "admin",
        current_user.get("name") if current_user else "Admin",
        "ISSUE_UPDATED",
        reports[match_index].get("busNumber", "BUS"),
        f"Updated issue {issue_id} status to '{status}' with remarks: '{admin_remarks or ''}'"
    )

    return {"success": True, "message": "Issue status updated", "issue": reports[match_index]}
