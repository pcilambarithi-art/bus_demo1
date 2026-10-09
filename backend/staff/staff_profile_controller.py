from ..database.database_service import get_db, load_db

def handle_get_staff_profile(current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    staff_member = None
    if current_user and current_user.get("role") == "staff":
        staff_member = next((s for s in db.get("staff", []) if s.get("id") == current_user.get("id")), None)
    if not staff_member:
        staff_member = db.get("staff", [{}])[0] if db.get("staff") else {}

    assigned_bus_id = staff_member.get("assignedBusId")
    buses = db.get("buses", [])
    assigned_bus = next((b for b in buses if b.get("id") == assigned_bus_id), buses[0] if buses else {})

    route_id = assigned_bus.get("routeId")
    routes = db.get("routes", [])
    assigned_route = next((r for r in routes if r.get("id") == route_id), routes[0] if routes else {})

    return helpers["json"]({
        "success": True,
        "staff": staff_member,
        "bus": assigned_bus,
        "route": assigned_route
    })
