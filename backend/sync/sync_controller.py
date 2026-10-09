from datetime import datetime
from ..database.database_service import get_db, load_db
from ..bus_tracking.live_telemetry_engine import get_all_live_buses, get_notification_history

def handle_sync(helpers: dict) -> bool:
    load_db()
    db = get_db()
    all_stops = []
    for r in db.get("routes", []):
        for s in r.get("stops", []):
            stop_copy = dict(s)
            stop_copy["routeId"] = r.get("id")
            all_stops.append(stop_copy)

    active_issues = [
        issue for issue in db.get("issue_reports", [])
        if issue.get("status") not in ("Closed", "Resolved")
    ]

    return helpers["json"]({
        "success": True,
        "buses": db.get("buses", []),
        "routes": db.get("routes", []),
        "stops": all_stops,
        "liveTelemetry": get_all_live_buses(),
        "notificationHistory": get_notification_history(),
        "announcements": [v for v in db.get("voice_announcements", []) if v.get("isActive")],
        "activeIssues": active_issues,
        "systemHealth": {
            "status": "ONLINE",
            "activeBuses": len([b for b in db.get("buses", []) if b.get("isActive")]),
            "activeStaff": len([s for s in db.get("staff", []) if s.get("status") == "active"]),
            "lastSyncedAt": datetime.utcnow().isoformat() + "Z",
            "sourceOfTruth": "DCE Central Transit Cloud Server v2.4 (Python Live GPS Engine)"
        }
    })
