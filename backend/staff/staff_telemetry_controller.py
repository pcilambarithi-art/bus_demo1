import time
from datetime import datetime
from ..database.database_service import get_db, load_db, save_db

def handle_update_bus_status(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    bus_id = body.get("busId")
    bus_number = body.get("busNumber")
    status = body.get("status")
    status_text = body.get("statusText")

    buses = db.get("buses", [])
    user_bus_id = current_user.get("assignedBusId") if current_user else None

    idx = -1
    for i, b in enumerate(buses):
        if (bus_id and b.get("id") == bus_id) or \
           (bus_number and b.get("busNumber", "").lower() == bus_number.lower()) or \
           (user_bus_id and b.get("id") == user_bus_id) or \
           (b.get("id") == "bus-07"):
            idx = i
            break

    if idx == -1:
        return helpers["error"]("Assigned bus not found", 404)

    target_bus = buses[idx]
    target_bus["operationalStatus"] = status or "On Route"
    if status_text:
        target_bus["statusText"] = status_text
    else:
        target_bus["statusText"] = f"{status} (Updated by Staff)"
    target_bus["lastUpdated"] = datetime.utcnow().isoformat() + "Z"

    save_db()
    return helpers["json"]({"success": True, "message": "Bus status updated successfully", "bus": target_bus})

def handle_update_gps(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    bus_id = body.get("busId")
    lat = body.get("latitude") or body.get("lat")
    lng = body.get("longitude") or body.get("lng")
    speed = body.get("speed")

    target_bus_id = bus_id or (current_user.get("assignedBusId") if current_user else None) or "bus-07"
    buses = db.get("buses", [])
    idx = next((i for i, b in enumerate(buses) if b.get("id") == target_bus_id), -1)

    if idx != -1 and lat is not None and lng is not None:
        buses[idx]["currentLat"] = float(lat)
        buses[idx]["currentLng"] = float(lng)
        if speed is not None:
            buses[idx]["currentSpeed"] = float(speed)
        buses[idx]["isLive"] = True
        buses[idx]["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
        save_db()

    return helpers["json"]({"success": True, "timestamp": int(time.time() * 1000)})
