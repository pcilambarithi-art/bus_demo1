import time
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from ..config import settings
from ..models.bus import Bus
from ..models.route import Route
from ..models.stop import Stop
from ..models.gps import ArrivalDepartureEvent, BusLatestLocation
from .gps_service import calculate_distance_meters
from .eta_service import calculate_eta_minutes

# In-memory bus station state tracker to prevent duplicate notifications
# Format: { bus_id: { station_id: "IDLE" | "APPROACHING" | "ARRIVED" | "WAITING" | "DEPARTED" } }
_bus_station_runtime_states: Dict[str, Dict[str, str]] = {}

def format_time_ampm(dt: datetime = None) -> str:
    dt = dt or datetime.utcnow()
    return dt.strftime("%I:%M %p")

def evaluate_geofencing_and_state(
    db: Session,
    bus: Bus,
    lat: float,
    lng: float,
    speed: float,
    route: Optional[Route],
    stops: List[Stop]
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Evaluates geofencing boundaries for all stops on the route.
    Returns:
    - updated_bus_state: dict of latest telemetry fields
    - events_generated: list of newly triggered deduplicated events
    """
    if bus.id not in _bus_station_runtime_states:
        _bus_station_runtime_states[bus.id] = {s.id: "IDLE" for s in stops}

    states = _bus_station_runtime_states[bus.id]
    events_generated = []
    now = datetime.utcnow()
    time_str = format_time_ampm(now)

    detected_current_station: Optional[Stop] = None
    detected_next_station: Optional[Stop] = None
    min_dist_to_stop = 9999999
    closest_stop: Optional[Stop] = None

    # Sort stops by sequence
    ordered_stops = sorted(stops, key=lambda s: s.sequence)
    final_stop = ordered_stops[-1] if ordered_stops else None

    for idx, stop in enumerate(ordered_stops):
        dist_m = calculate_distance_meters(lat, lng, stop.lat, stop.lng)
        current_state = states.get(stop.id, "IDLE")
        approach_r = settings.GEOFENCE_APPROACH_RADIUS_METERS
        arrival_r = stop.geofence_radius or settings.GEOFENCE_STATION_RADIUS_METERS

        if dist_m < min_dist_to_stop:
            min_dist_to_stop = dist_m
            closest_stop = stop

        # 1. APPROACHING EVENT
        if dist_m <= approach_r and dist_m > arrival_r and current_state == "IDLE":
            states[stop.id] = "APPROACHING"
            eta_mins = calculate_eta_minutes(lat, lng, stop.lat, stop.lng, speed)
            ev = {
                "id": f"ev-{bus.bus_number}-{stop.id}-app-{int(time.time()*1000)}",
                "bus_id": bus.id,
                "bus_number": bus.bus_number,
                "station_id": stop.id,
                "station_name": stop.name,
                "sequence": stop.sequence,
                "event_type": "APPROACHING",
                "indicator": "red",
                "speed_kmh": speed,
                "title": f"DCE {bus.bus_number} Approaching {stop.short_name or stop.name}",
                "message": f"Bus {bus.bus_number} is approaching {stop.name}. Distance remaining: {dist_m}m. ETA: {eta_mins} min.",
                "event_timestamp": now
            }
            events_generated.append(ev)

        # 2. ARRIVED EVENT
        elif dist_m <= arrival_r and current_state in ("IDLE", "APPROACHING"):
            states[stop.id] = "ARRIVED"
            detected_current_station = stop
            ev = {
                "id": f"ev-{bus.bus_number}-{stop.id}-arr-{int(time.time()*1000)}",
                "bus_id": bus.id,
                "bus_number": bus.bus_number,
                "station_id": stop.id,
                "station_name": stop.name,
                "sequence": stop.sequence,
                "event_type": "ARRIVED",
                "indicator": "green",
                "speed_kmh": speed,
                "title": f"🟢 {bus.bus_number} Reached {stop.short_name or stop.name}",
                "message": f"🟢 {bus.bus_number} has reached {stop.name} at {time_str}. Waiting at station.",
                "event_timestamp": now
            }
            events_generated.append(ev)

        # 3. WAITING AT STATION
        elif dist_m <= arrival_r and current_state == "ARRIVED":
            if speed <= 5.0:
                states[stop.id] = "WAITING"
            detected_current_station = stop

        # 4. DEPARTED EVENT
        elif dist_m > (arrival_r + 20) and current_state in ("ARRIVED", "WAITING"):
            states[stop.id] = "DEPARTED"
            next_idx = idx + 1
            next_st = ordered_stops[next_idx] if next_idx < len(ordered_stops) else None
            next_name = next_st.name if next_st else "Destination"
            ev = {
                "id": f"ev-{bus.bus_number}-{stop.id}-dep-{int(time.time()*1000)}",
                "bus_id": bus.id,
                "bus_number": bus.bus_number,
                "station_id": stop.id,
                "station_name": stop.name,
                "sequence": stop.sequence,
                "event_type": "DEPARTED",
                "indicator": "red",
                "speed_kmh": speed,
                "title": f"🔴 {bus.bus_number} Departed {stop.short_name or stop.name}",
                "message": f"🔴 {bus.bus_number} departed from {stop.name} at {time_str}. Next stop: {next_name}.",
                "event_timestamp": now
            }
            events_generated.append(ev)

    # Determine next expected stop in route sequence
    for stop in ordered_stops:
        if states.get(stop.id) not in ("ARRIVED", "WAITING", "DEPARTED"):
            detected_next_station = stop
            break
    if not detected_next_station and ordered_stops:
        detected_next_station = ordered_stops[-1]

    # Destination check (near terminus)
    is_near_destination = False
    if final_stop:
        final_dist = calculate_distance_meters(lat, lng, final_stop.lat, final_stop.lng)
        if final_dist <= settings.GEOFENCE_DESTINATION_RADIUS_METERS:
            is_near_destination = True
            if states.get(final_stop.id) != "DESTINATION":
                states[final_stop.id] = "DESTINATION"
                ev = {
                    "id": f"ev-{bus.bus_number}-{final_stop.id}-dest-{int(time.time()*1000)}",
                    "bus_id": bus.id,
                    "bus_number": bus.bus_number,
                    "station_id": final_stop.id,
                    "station_name": final_stop.name,
                    "sequence": final_stop.sequence,
                    "event_type": "DESTINATION",
                    "indicator": "yellow",
                    "speed_kmh": speed,
                    "title": "🟡 Destination Reached",
                    "message": f"🟡 {bus.bus_number} has reached {final_stop.name}. Journey completed.",
                    "event_timestamp": now
                }
                events_generated.append(ev)

    # Save generated events to database
    for ev_data in events_generated:
        db_ev = ArrivalDepartureEvent(**ev_data)
        db.add(db_ev)

    # Calculate status and color indicator:
    # 🟢 green: At Station
    # 🔴 red: Moving to next station
    # 🟡 yellow: Destination reached
    if is_near_destination:
        status_key = "destination"
        indicator = "yellow"
        label = "Destination / Arrived"
    elif detected_current_station and (speed <= 5.0 or states.get(detected_current_station.id) in ("ARRIVED", "WAITING")):
        status_key = "at_station"
        indicator = "green"
        label = f"At Station ({detected_current_station.short_name or detected_current_station.name})"
    else:
        status_key = "moving"
        indicator = "red"
        label = f"Moving to {detected_next_station.short_name or detected_next_station.name if detected_next_station else 'Next Station'}"

    dist_to_next = 0
    eta_to_next = 0
    if detected_next_station:
        dist_to_next = calculate_distance_meters(lat, lng, detected_next_station.lat, detected_next_station.lng)
        eta_to_next = calculate_eta_minutes(lat, lng, detected_next_station.lat, detected_next_station.lng, speed)

    telemetry_state = {
        "busId": bus.id,
        "busNumber": bus.bus_number,
        "plateNumber": bus.plate_number,
        "routeId": bus.route_id,
        "driverName": bus.driver_name,
        "lat": lat,
        "lng": lng,
        "speedKmh": speed,
        "heading": 0.0,
        "accuracy": 5.0,
        "lastUpdated": int(time.time() * 1000),
        "status": status_key,
        "statusIndicator": indicator,
        "statusLabel": label,
        "currentStation": {
            "id": detected_current_station.id,
            "name": detected_current_station.name,
            "shortName": detected_current_station.short_name,
            "sequence": detected_current_station.sequence,
            "lat": detected_current_station.lat,
            "lng": detected_current_station.lng
        } if detected_current_station else None,
        "nextStation": {
            "id": detected_next_station.id,
            "name": detected_next_station.name,
            "shortName": detected_next_station.short_name,
            "sequence": detected_next_station.sequence,
            "lat": detected_next_station.lat,
            "lng": detected_next_station.lng
        } if detected_next_station else None,
        "distanceToNextStationMeters": dist_to_next,
        "etaToNextStationMinutes": eta_to_next,
        "secondsSinceUpdate": 0,
        "gpsHealth": "active",
        "gpsHealthLabel": "Live GPS Active (Updated 0s ago)",
        "isSimulated": False
    }

    return telemetry_state, events_generated
