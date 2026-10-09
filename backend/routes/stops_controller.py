import time
from ..database.database_service import get_db, load_db, save_db
from ..admin.admin_activity_logger import log_activity

def handle_get_stops(helpers: dict) -> bool:
    load_db()
    db = get_db()
    all_stops = []
    for r in db.get("routes", []):
        for s in r.get("stops", []):
            stop_copy = dict(s)
            stop_copy["routeId"] = r.get("id")
            stop_copy["routeName"] = r.get("name")
            all_stops.append(stop_copy)
    return helpers["json"]({"success": True, "count": len(all_stops), "stops": all_stops})

def handle_create_stop(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    lat = body.get("lat") if body.get("lat") is not None else body.get("latitude")
    lng = body.get("lng") if body.get("lng") is not None else body.get("longitude")
    name = body.get("name")
    route_id = body.get("routeId")

    if not name or lat is None or lng is None:
        return helpers["error"]("Stop name, latitude, and longitude are required", 400)

    routes = db.get("routes", [])
    target_route = next((r for r in routes if r.get("id") == route_id), routes[0] if routes else None)
    if not target_route:
        return helpers["error"]("Target route not found", 404)

    new_stop_id = body.get("id") or f"stop-{int(time.time() * 1000)}"
    stops = target_route.setdefault("stops", [])

    new_stop = {
        "id": new_stop_id,
        "name": name,
        "shortName": body.get("shortName") or name.split(" ")[0],
        "lat": float(lat),
        "lng": float(lng),
        "sequence": int(body.get("sequence") or (len(stops) + 1)),
        "scheduledTime": body.get("scheduledTime") or "07:30 AM",
        "studentsWaiting": int(body.get("studentsWaiting") or 0),
        "isTerminal": bool(body.get("isTerminal")),
        "routeId": target_route.get("id"),
        "isActive": True
    }

    stops.append(new_stop)
    stops.sort(key=lambda s: s.get("sequence", 0))

    waypoints = target_route.setdefault("waypoints", [])
    waypoints.append([new_stop["lat"], new_stop["lng"]])

    save_db()
    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "STOP_ADDED", new_stop["name"], f"Added bus stop '{new_stop['name']}' at [{new_stop['lat']:.4f}, {new_stop['lng']:.4f}] on route {target_route.get('name')}")

    return helpers["json"]({"success": True, "message": "Stop added successfully", "stop": new_stop, "route": target_route})

def handle_update_stop(stop_id: str, body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    found_stop = None

    for r in db.get("routes", []):
        stops = r.get("stops", [])
        for i, s in enumerate(stops):
            if s.get("id") == stop_id:
                stops[i] = {**s, **body, "id": stop_id}
                found_stop = stops[i]
                break
        if found_stop:
            break

    if not found_stop:
        return helpers["error"](f"Stop with ID '{stop_id}' not found", 404)

    save_db()
    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "STOP_MODIFIED", found_stop.get("name", stop_id), f"Updated location coordinates or sequence for stop '{found_stop.get('name')}'")

    return helpers["json"]({"success": True, "message": "Stop updated successfully", "stop": found_stop})

def handle_delete_stop(stop_id: str, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    deleted_stop = None

    for r in db.get("routes", []):
        stops = r.get("stops", [])
        for i, s in enumerate(stops):
            if s.get("id") == stop_id:
                deleted_stop = stops.pop(i)
                break
        if deleted_stop:
            break

    if not deleted_stop:
        return helpers["error"](f"Stop with ID '{stop_id}' not found", 404)

    save_db()
    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "STOP_DELETED", deleted_stop.get("name", stop_id), f"Deleted bus stop '{deleted_stop.get('name')}'")

    return helpers["json"]({"success": True, "message": f"Stop '{deleted_stop.get('name')}' deleted successfully"})
