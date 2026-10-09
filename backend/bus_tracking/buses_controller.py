import random
from datetime import datetime
from ..database.database_service import get_db, load_db, save_db
from ..admin.admin_activity_logger import log_activity

def handle_get_buses(helpers: dict) -> bool:
    load_db()
    db = get_db()
    buses = db.get("buses", [])
    return helpers["json"]({"success": True, "count": len(buses), "buses": buses})

def handle_create_bus(body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    bus_number = body.get("busNumber")
    if not bus_number:
        return helpers["error"]("Bus number is required", 400)

    clean_num = "".join(c for c in bus_number.lower() if c.isalnum()) or str(int(datetime.now().timestamp()))
    new_id = body.get("id") or f"bus-{clean_num}"

    route_id = body.get("routeId")
    route = None
    routes = db.get("routes", [])
    if route_id:
        route = next((r for r in routes if r.get("id") == route_id), None)
    if not route and routes:
        route = routes[0]

    first_stop = route.get("stops", [{}])[0] if route and route.get("stops") else {}

    new_bus = {
        "id": new_id,
        "busNumber": bus_number.upper(),
        "plateNumber": body.get("plateNumber") or f"TN-11-DCE-{random.randint(1000, 9999)}",
        "routeId": route_id or (route.get("id") if route else "route-07"),
        "routeName": body.get("routeName") or (route.get("name") if route else "DCE Express"),
        "startingPoint": body.get("startingPoint") or (route.get("origin") if route else "Tambaram"),
        "destination": body.get("destination") or (route.get("destination") if route else "DCE Campus"),
        "assignedStaffId": body.get("assignedStaffId") or "staff-01",
        "driverName": body.get("driverName") or "DCE Bus Driver",
        "driverPhone": body.get("driverPhone") or "+91 94440 00000",
        "driverRating": 4.8,
        "busImage": body.get("busImage") or "https://images.unsplash.com/photo-1618847791039-886c74c001ad?auto=format&fit=crop&q=80&w=800",
        "capacity": int(body.get("capacity") or 50),
        "currentOccupancy": int(body.get("currentOccupancy") or 0),
        "hasAC": bool(body.get("hasAC")),
        "isLive": True,
        "statusText": body.get("statusText") or "In Service (Active)",
        "operationalStatus": body.get("operationalStatus") or "In Service",
        "isActive": True,
        "currentLat": body.get("currentLat") or first_stop.get("lat", 12.9249),
        "currentLng": body.get("currentLng") or first_stop.get("lng", 80.1165),
        "currentSpeed": 0,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }

    buses = db.setdefault("buses", [])
    existing_idx = next((i for i, b in enumerate(buses) if b.get("id") == new_id or b.get("busNumber") == new_bus["busNumber"]), -1)
    if existing_idx >= 0:
        buses[existing_idx] = {**buses[existing_idx], **new_bus}
    else:
        buses.append(new_bus)

    save_db()
    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "BUS_ADDED", new_bus["busNumber"], f"Added new bus {new_bus['busNumber']} assigned to route {new_bus['routeName']}")

    return helpers["json"]({"success": True, "message": "Bus created successfully", "bus": new_bus})

def handle_update_bus(bus_id: str, body: dict, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    buses = db.get("buses", [])
    idx = next((i for i, b in enumerate(buses) if b.get("id") == bus_id), -1)
    if idx == -1:
        return helpers["error"](f"Bus with ID '{bus_id}' not found", 404)

    updated = {
        **buses[idx],
        **body,
        "id": bus_id,
        "lastUpdated": datetime.utcnow().isoformat() + "Z"
    }
    buses[idx] = updated
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "BUS_UPDATED", updated.get("busNumber", bus_id), f"Modified specifications or status of bus {updated.get('busNumber')}")

    return helpers["json"]({"success": True, "message": "Bus updated successfully", "bus": updated})

def handleDeleteBus(bus_id: str, current_user: dict, helpers: dict) -> bool:
    return handle_delete_bus(bus_id, current_user, helpers)

def handle_delete_bus(bus_id: str, current_user: dict, helpers: dict) -> bool:
    load_db()
    db = get_db()
    buses = db.get("buses", [])
    bus = next((b for b in buses if b.get("id") == bus_id), None)
    if not bus:
        return helpers["error"](f"Bus with ID '{bus_id}' not found", 404)

    db["buses"] = [b for b in buses if b.get("id") != bus_id]
    save_db()

    c_id = current_user.get("id") if current_user else None
    c_name = current_user.get("name") if current_user else None
    log_activity(c_id, c_name, "BUS_DELETED", bus.get("busNumber", bus_id), f"Deleted bus {bus.get('busNumber')} from active fleet")

    return helpers["json"]({"success": True, "message": f"Bus {bus.get('busNumber')} removed successfully"})
