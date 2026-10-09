import time
from ..database.database_service import get_db, load_db, save_db
from ..admin.admin_activity_logger import log_activity

def handle_get_routes(helpers: dict) -> bool:
    load_db()
    db = get_db()
    routes = db.get("routes", [])
    return helpers["json"]({"success": True, "count": len(routes), "routes": routes})

def handle_create_route(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    name = body.get("name")
    if not name:
        return helpers["error"]("Route name is required", 400)

    routes = db.setdefault("routes", [])
    new_id = body.get("id") or f"route-{int(time.time() * 1000)}"
    code = body.get("code") or f"R-{len(routes) + 1}"
    route_number = body.get("routeNumber") or str(len(routes) + 1)
    origin = body.get("origin") or "Tambaram"
    destination = body.get("destination") or "DCE Campus, Manimangalam"
    stops = body.get("stops") or []

    waypoints = body.get("waypoints")
    if not waypoints:
        waypoints = [[s.get("lat"), s.get("lng")] for s in stops if s.get("lat") and s.get("lng")]

    new_route = {
        "id": new_id,
        "name": name,
        "code": code,
        "routeNumber": route_number,
        "origin": origin,
        "destination": destination,
        "startingPoint": origin,
        "description": body.get("description") or f"Route {name}",
        "totalDistanceKm": float(body.get("totalDistanceKm") or 15.0),
        "estimatedTotalMinutes": int(body.get("estimatedTotalMinutes") or 35),
        "assignedBusIds": body.get("assignedBusIds") or [],
        "stops": stops,
        "waypoints": waypoints
    }

    routes.append(new_route)
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "ROUTE_CREATED", new_route["name"], f"Created route {new_route['code']}: {new_route['name']}")

    return helpers["json"]({"success": True, "message": "Route created successfully", "route": new_route})

def handle_update_route(route_id: str, body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    routes = db.get("routes", [])
    idx = next((i for i, r in enumerate(routes) if r.get("id") == route_id), -1)
    if idx == -1:
        return helpers["error"](f"Route with ID '{route_id}' not found", 404)

    updated = {
        **routes[idx],
        **body,
        "id": route_id
    }
    routes[idx] = updated
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "ROUTE_UPDATED", updated.get("name", route_id), f"Updated stops and sequence for route {updated.get('name')}")

    return helpers["json"]({"success": True, "message": "Route updated successfully", "route": updated})
