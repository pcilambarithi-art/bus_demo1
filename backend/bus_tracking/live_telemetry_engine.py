import math
import time
import threading
from datetime import datetime
from ..database.database_service import get_db, load_db, save_db

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Haversine formula to compute great-circle distance between two GPS coordinates in meters."""
    R = 6371000 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return int(round(R * c))

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Computes compass bearing in degrees between two points."""
    y = math.sin(math.radians(lon2 - lon1)) * math.cos(math.radians(lat2))
    x = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) -
         math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(math.radians(lon2 - lon1)))
    brng = math.degrees(math.atan2(y, x))
    return int(round((brng + 360.0) % 360.0))

def format_time(timestamp_ms: int = None) -> str:
    """Formats epoch timestamp in milliseconds to HH:MM AM/PM."""
    if timestamp_ms is None:
        timestamp_ms = int(time.time() * 1000)
    dt = datetime.fromtimestamp(timestamp_ms / 1000.0)
    return dt.strftime("%I:%M %p")

# In-memory runtime state for all buses
_live_bus_states = {}
_sse_lock = threading.Lock()
_sse_clients = set()
_notification_history = []

def add_sse_client(client_queue):
    with _sse_lock:
        _sse_clients.add(client_queue)

def remove_sse_client(client_queue):
    with _sse_lock:
        _sse_clients.discard(client_queue)

def notify_sse_clients(payload: dict):
    with _sse_lock:
        dead_clients = []
        for client_q in _sse_clients:
            try:
                client_q.put_nowait(payload)
            except Exception:
                dead_clients.append(client_q)
        for dead in dead_clients:
            _sse_clients.discard(dead)

def get_or_create_bus_state(bus: dict, route: dict) -> dict:
    key = bus.get("id")
    if key not in _live_bus_states:
        stops = route.get("stops", []) if route else []
        station_states = {}

        for stop in stops:
            sid = stop.get("id")
            station_states[sid] = {
                "stationId": sid,
                "stationName": stop.get("name"),
                "shortName": stop.get("shortName") or stop.get("name"),
                "sequence": stop.get("sequence", 1),
                "lat": stop.get("lat", 12.9249),
                "lng": stop.get("lng", 80.1165),
                "approachRadiusMeters": 450,
                "arrivalRadiusMeters": 60,
                "state": "IDLE", # 'IDLE' | 'APPROACHING' | 'ARRIVED' | 'WAITING' | 'DEPARTED'
                "arrivalTime": None,
                "departureTime": None,
                "distanceMeters": 0,
                "etaMinutes": 0,
            }

        _live_bus_states[key] = {
            "busId": bus.get("id"),
            "busNumber": bus.get("busNumber"),
            "plateNumber": bus.get("plateNumber"),
            "routeId": bus.get("routeId"),
            "driverName": bus.get("driverName"),
            "lat": bus.get("currentLat") or (stops[0].get("lat") if stops else 12.9249),
            "lng": bus.get("currentLng") or (stops[0].get("lng") if stops else 80.1165),
            "speedKmh": bus.get("currentSpeed") or 0,
            "heading": 0,
            "accuracy": 5,
            "lastUpdated": int(time.time() * 1000),
            "status": "LIVE",
            "statusIndicator": "green", # 'green' | 'red' | 'yellow'
            "statusLabel": "At Station",
            "currentStation": stops[0] if stops else None,
            "nextStation": stops[1] if len(stops) > 1 else (stops[0] if stops else None),
            "distanceToNextStationMeters": 0,
            "etaToNextStationMinutes": 0,
            "stationStates": station_states,
            "lastValidCoord": None,
        }
    return _live_bus_states[key]

def ingest_driver_gps(payload: dict) -> dict:
    load_db()
    db = get_db()

    bus_id = payload.get("busId")
    bus_number = payload.get("busNumber")
    try:
        lat = float(payload.get("latitude"))
        lng = float(payload.get("longitude"))
    except (TypeError, ValueError):
        raise ValueError("Invalid GPS coordinates")

    spd = max(0, int(round(float(payload.get("speed", 0)))))
    heading = float(payload.get("heading", 0))
    accuracy = int(round(float(payload.get("accuracy", 5))))
    timestamp = int(payload.get("timestamp") or (time.time() * 1000))

    # Match bus in database
    buses = db.get("buses", [])
    matched_bus = None
    for b in buses:
        if (bus_id and b.get("id") == bus_id) or \
           (bus_number and b.get("busNumber", "").lower() == str(bus_number).lower()):
            matched_bus = b
            break
    if not matched_bus and buses:
        matched_bus = buses[0]

    if not matched_bus:
        raise ValueError("Bus not found for telemetry update")

    routes = db.get("routes", [])
    route = next((r for r in routes if r.get("id") == matched_bus.get("routeId")), routes[0] if routes else None)
    bus_state = get_or_create_bus_state(matched_bus, route)

    # 1. GPS Jitter & Coordinate Jump Filter
    if bus_state.get("lastValidCoord"):
        last_c = bus_state["lastValidCoord"]
        jump_dist = calculate_distance_meters(last_c["lat"], last_c["lng"], lat, lng)
        time_delta_sec = max(1.0, (timestamp - bus_state["lastUpdated"]) / 1000.0)
        implied_speed_kmh = (jump_dist / time_delta_sec) * 3.6

        if implied_speed_kmh > 150.0 and jump_dist > 500:
            print(f"[GPS Jitter Filter] Rejected jump for {matched_bus.get('busNumber')}: {jump_dist}m in {time_delta_sec}s")
            return {"success": False, "reason": "GPS coordinate jitter rejected", "state": bus_state}

    bus_state["lastValidCoord"] = {"lat": lat, "lng": lng}
    bus_state["lat"] = lat
    bus_state["lng"] = lng
    bus_state["speedKmh"] = spd
    bus_state["heading"] = heading
    bus_state["accuracy"] = accuracy
    bus_state["lastUpdated"] = timestamp

    matched_bus["currentLat"] = lat
    matched_bus["currentLng"] = lng
    matched_bus["currentSpeed"] = spd
    matched_bus["isLive"] = True
    matched_bus["lastUpdated"] = datetime.fromtimestamp(timestamp / 1000.0).isoformat() + "Z"
    save_db()

    # 2. Station Geofencing State Machine
    stops = route.get("stops", []) if route else []
    events_generated = []
    detected_current_station = None
    detected_next_station = None
    min_dist_to_upcoming = float("inf")

    final_stop = stops[-1] if stops else None
    is_near_final_stop = False
    if final_stop:
        final_dist = calculate_distance_meters(lat, lng, final_stop.get("lat"), final_stop.get("lng"))
        if final_dist <= 120:
            is_near_final_stop = True

    for idx, stop in enumerate(stops):
        sid = stop.get("id")
        st_state = bus_state["stationStates"].get(sid)
        if not st_state:
            st_state = {
                "stationId": sid,
                "stationName": stop.get("name"),
                "shortName": stop.get("shortName") or stop.get("name"),
                "sequence": stop.get("sequence", idx + 1),
                "lat": stop.get("lat"),
                "lng": stop.get("lng"),
                "approachRadiusMeters": 450,
                "arrivalRadiusMeters": 60,
                "state": "IDLE",
                "arrivalTime": None,
                "departureTime": None,
                "distanceMeters": 0,
                "etaMinutes": 0,
            }
            bus_state["stationStates"][sid] = st_state

        dist_m = calculate_distance_meters(lat, lng, stop.get("lat"), stop.get("lng"))
        st_state["distanceMeters"] = dist_m

        eff_speed_mps = max(15.0, (spd * 1000.0) / 3600.0)
        eta_mins = max(0, int(round(dist_m / eff_speed_mps / 60.0)))
        st_state["etaMinutes"] = eta_mins

        prev_state = st_state.get("state", "IDLE")

        # APPROACHING EVENT (<= 450m and > 60m)
        if dist_m <= st_state["approachRadiusMeters"] and dist_m > st_state["arrivalRadiusMeters"]:
            if prev_state == "IDLE":
                st_state["state"] = "APPROACHING"
                ev = {
                    "id": f"ev-{matched_bus.get('busNumber')}-{sid}-appr-{int(time.time()*1000)}",
                    "busNumber": matched_bus.get("busNumber"),
                    "stationId": sid,
                    "stationName": stop.get("name"),
                    "sequence": stop.get("sequence"),
                    "event": "APPROACHING",
                    "eventLabel": "Approaching",
                    "indicator": "red",
                    "timeFormatted": format_time(timestamp),
                    "timestamp": timestamp,
                    "speedKmh": spd,
                    "distanceMeters": dist_m,
                    "etaMinutes": max(1, eta_mins),
                    "title": f"Approaching {stop.get('shortName') or stop.get('name')}",
                    "message": f"{matched_bus.get('busNumber')} is approaching {stop.get('name')}. Distance: {dist_m}m, ETA: ~{max(1, eta_mins)} min."
                }
                events_generated.append(ev)
                _notification_history.insert(0, ev)

        # ARRIVED EVENT (<= 60m or <= 85m and speed <= 5)
        is_inside_arrival = (dist_m <= st_state["arrivalRadiusMeters"]) or (dist_m <= 85 and spd <= 5)
        if is_inside_arrival:
            if prev_state in ["IDLE", "APPROACHING"]:
                st_state["state"] = "ARRIVED"
                st_state["arrivalTime"] = format_time(timestamp)
                ev = {
                    "id": f"ev-{matched_bus.get('busNumber')}-{sid}-arr-{int(time.time()*1000)}",
                    "busNumber": matched_bus.get("busNumber"),
                    "stationId": sid,
                    "stationName": stop.get("name"),
                    "sequence": stop.get("sequence"),
                    "event": "ARRIVED",
                    "eventLabel": "Arrived",
                    "indicator": "green",
                    "timeFormatted": st_state["arrivalTime"],
                    "timestamp": timestamp,
                    "speedKmh": spd,
                    "distanceMeters": dist_m,
                    "etaMinutes": 0,
                    "title": f"🟢 Reached {stop.get('shortName') or stop.get('name')}",
                    "message": f"🟢 {matched_bus.get('busNumber')} has reached {stop.get('name')}. Arrival: {st_state['arrivalTime']}. The bus is currently waiting at the station."
                }
                events_generated.append(ev)
                _notification_history.insert(0, ev)
            elif prev_state == "ARRIVED" and spd <= 2:
                st_state["state"] = "WAITING"

        # DEPARTED EVENT (> 90m and speed >= 4)
        has_departed = (prev_state in ["ARRIVED", "WAITING"]) and (dist_m > 90) and (spd >= 4)
        if has_departed:
            st_state["state"] = "DEPARTED"
            st_state["departureTime"] = format_time(timestamp)
            next_stop_obj = stops[idx + 1] if idx + 1 < len(stops) else None
            next_eta_mins = max(1, int(round(calculate_distance_meters(lat, lng, next_stop_obj["lat"], next_stop_obj["lng"]) / 400.0))) if next_stop_obj else 0

            ev = {
                "id": f"ev-{matched_bus.get('busNumber')}-{sid}-dep-{int(time.time()*1000)}",
                "busNumber": matched_bus.get("busNumber"),
                "stationId": sid,
                "stationName": stop.get("name"),
                "sequence": stop.get("sequence"),
                "event": "DEPARTED",
                "eventLabel": "Departed",
                "indicator": "red",
                "timeFormatted": st_state["departureTime"],
                "timestamp": timestamp,
                "speedKmh": spd,
                "nextStationName": next_stop_obj.get("name") if next_stop_obj else "Destination",
                "nextStationEtaMinutes": next_eta_mins,
                "title": f"🔴 Departed {stop.get('shortName') or stop.get('name')}",
                "message": f"🔴 {matched_bus.get('busNumber')} has departed from {stop.get('name')}. Departure: {st_state['departureTime']}. Next stop: {next_stop_obj.get('name') if next_stop_obj else 'Destination'}. ETA: {next_eta_mins} mins."
            }
            events_generated.append(ev)
            _notification_history.insert(0, ev)

        if dist_m <= 100:
            detected_current_station = stop

        if st_state["state"] != "DEPARTED" and dist_m < min_dist_to_upcoming:
            min_dist_to_upcoming = dist_m
            detected_next_station = stop

    # DESTINATION EVENT
    if is_near_final_stop and bus_state.get("statusIndicator") != "yellow":
        dest_ev = {
            "id": f"ev-{matched_bus.get('busNumber')}-dest-{int(time.time()*1000)}",
            "busNumber": matched_bus.get("busNumber"),
            "stationId": final_stop.get("id"),
            "stationName": final_stop.get("name"),
            "sequence": final_stop.get("sequence"),
            "event": "DESTINATION",
            "eventLabel": "Destination",
            "indicator": "yellow",
            "timeFormatted": format_time(timestamp),
            "timestamp": timestamp,
            "speedKmh": spd,
            "title": "🟡 Destination Reached",
            "message": f"🟡 {matched_bus.get('busNumber')} has reached the destination ({final_stop.get('name')}). The journey is completed."
        }
        events_generated.append(dest_ev)
        _notification_history.insert(0, dest_ev)

    # 3-State Status Determination:
    # 🟢 Green: At station
    # 🔴 Red: Moving to next station
    # 🟡 Yellow: Destination / Terminus
    if is_near_final_stop:
        bus_state["status"] = "destination"
        bus_state["statusIndicator"] = "yellow"
        bus_state["statusLabel"] = "Destination / Arrived"
    elif detected_current_station and (spd <= 4 or bus_state["stationStates"].get(detected_current_station["id"], {}).get("state") == "ARRIVED"):
        bus_state["status"] = "at_station"
        bus_state["statusIndicator"] = "green"
        bus_state["statusLabel"] = f"At Station ({detected_current_station.get('shortName') or detected_current_station.get('name')})"
    else:
        bus_state["status"] = "moving"
        bus_state["statusIndicator"] = "red"
        bus_state["statusLabel"] = f"Moving to {detected_next_station.get('shortName') if detected_next_station else 'Next Station'}"

    bus_state["currentStation"] = detected_current_station or bus_state.get("currentStation")
    bus_state["nextStation"] = detected_next_station or (stops[-1] if stops else None)
    if detected_next_station:
        bus_state["distanceToNextStationMeters"] = calculate_distance_meters(lat, lng, detected_next_station["lat"], detected_next_station["lng"])
        bus_state["etaToNextStationMinutes"] = max(1, int(round(bus_state["distanceToNextStationMeters"] / 400.0)))
    else:
        bus_state["distanceToNextStationMeters"] = 0
        bus_state["etaToNextStationMinutes"] = 0

    if len(_notification_history) > 100:
        del _notification_history[100:]

    # Broadcast to SSE clients
    broadcast_data = {
        "type": "GPS_TELEMETRY_UPDATE",
        "bus": bus_state,
        "events": events_generated,
        "timestamp": int(time.time() * 1000)
    }
    notify_sse_clients(broadcast_data)

    return {
        "success": True,
        "bus": bus_state,
        "events": events_generated
    }

def get_all_live_buses() -> list:
    load_db()
    db = get_db()
    buses = db.get("buses", [])
    routes = db.get("routes", [])

    results = []
    now_ms = int(time.time() * 1000)

    for b in buses:
        r = next((route for route in routes if route.get("id") == b.get("routeId")), routes[0] if routes else None)
        st = get_or_create_bus_state(b, r)
        secs_since = int(round((now_ms - st["lastUpdated"]) / 1000.0))

        if secs_since <= 25:
            health = "active"
            health_label = f"Live GPS Active (Updated {secs_since}s ago)"
        elif secs_since <= 60:
            health = "weak"
            health_label = f"GPS Signal Weak (Updated {secs_since}s ago)"
        else:
            health = "offline"
            health_label = "GPS Signal Lost / Offline"

        copy_st = dict(st)
        copy_st["secondsSinceUpdate"] = secs_since
        copy_st["gpsHealth"] = health
        copy_st["gpsHealthLabel"] = health_label
        results.append(copy_st)

    return results

def get_notification_history(bus_filter: str = None) -> list:
    if not bus_filter:
        return list(_notification_history)
    bf = bus_filter.lower()
    return [e for e in _notification_history if e.get("busNumber", "").lower() == bf or e.get("stationId", "").lower() == bf]

process_live_telemetry = ingest_driver_gps

