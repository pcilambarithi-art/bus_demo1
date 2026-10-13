import json
import time
import asyncio
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.bus import Bus
from ..models.route import Route
from ..models.stop import Stop
from ..models.gps import GPSHistory, BusLatestLocation, ArrivalDepartureEvent
from ..schemas.gps import GPSIngestRequest, GPSStaffUpdateRequest
from ..services.gps_service import validate_gps_reading, get_gps_health
from ..services.geofencing import evaluate_geofencing_and_state
from ..services.notification_service import dispatch_station_notifications
from ..services.live_updates import sse_manager
from ..security.permissions import get_optional_user, verify_device_credentials

router = APIRouter(tags=["GPS Telemetry & Live Streaming"])

@router.post("/driver/telemetry")
@router.post("/staff/gps")
async def ingest_driver_gps(
    payload: GPSIngestRequest,
    x_device_id: Optional[str] = Header(None),
    x_device_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Ingests live GPS coordinates from the driver's device or Raspberry Pi 5 bus agent,
    enforces device-to-bus binding when device credentials are supplied,
    performs jitter filtering, executes geofence checks, updates database,
    and pushes live updates over SSE.
    """
    lat = payload.latitude
    lng = payload.longitude
    spd = payload.speed or 0.0
    heading = payload.heading or 0.0
    accuracy = payload.accuracy or 5.0
    is_simulated = bool(payload.isSimulated)

    # 1. Resolve Target Bus
    bus = None
    if payload.busId:
        bus = db.query(Bus).filter(Bus.id == payload.busId).first()
    if not bus and payload.busNumber:
        bus = db.query(Bus).filter(Bus.bus_number == payload.busNumber.upper()).first()
    if not bus:
        bus = db.query(Bus).first()

    if not bus:
        raise HTTPException(status_code=404, detail="No bus found matching provided identifier")

    # 1b. Enforce Raspberry Pi Bus Agent Credentials & Bus Assignment Binding (if headers present)
    verify_device_credentials(db, x_device_id, x_device_key, target_bus_id=bus.id, require_strict=False)


    # 2. Anti-Jitter and Physics Plausibility Check
    is_valid, reject_reason = validate_gps_reading(db, bus, lat, lng, spd, payload.timestamp)

    # Record reading in GPS History log
    device_dt = datetime.utcfromtimestamp(payload.timestamp / 1000.0) if payload.timestamp else datetime.utcnow()
    gps_record = GPSHistory(

        bus_id=bus.id,
        bus_number=bus.bus_number,
        latitude=lat,
        longitude=lng,
        speed=spd,
        heading=heading,
        accuracy=accuracy,
        is_simulated=is_simulated,
        is_valid=is_valid,
        rejection_reason=reject_reason,
        device_timestamp=device_dt,
        received_at=datetime.utcnow()
    )
    db.add(gps_record)
    db.commit()

    if not is_valid:
        # Gracefully return rejected reason without crashing frontend
        latest = db.query(BusLatestLocation).filter(BusLatestLocation.bus_id == bus.id).first()
        return {
            "success": False,
            "reason": reject_reason,
            "state": latest
        }

    # 3. Fetch Route and Ordered Stops for Geofence State Machine
    route = db.query(Route).filter(Route.id == bus.route_id).first() if bus.route_id else None
    stops = db.query(Stop).filter(Stop.route_id == bus.route_id).order_by(Stop.sequence.asc()).all() if bus.route_id else []

    # 4. Evaluate Geofencing & Event Triggers
    telemetry_state, events_generated = evaluate_geofencing_and_state(
        db=db,
        bus=bus,
        lat=lat,
        lng=lng,
        speed=spd,
        route=route,
        stops=stops
    )
    telemetry_state["isSimulated"] = is_simulated

    # 5. Update Bus Entity & Latest Location Table
    bus.current_lat = lat
    bus.current_lng = lng
    bus.current_speed = spd
    bus.last_updated = datetime.utcnow()
    bus.is_live = True

    latest = db.query(BusLatestLocation).filter(BusLatestLocation.bus_id == bus.id).first()
    if not latest:
        latest = BusLatestLocation(bus_id=bus.id, bus_number=bus.bus_number)
        db.add(latest)

    latest.latitude = lat
    latest.longitude = lng
    latest.speed = spd
    latest.heading = heading
    latest.accuracy = accuracy
    latest.status = telemetry_state.get("status", "moving")
    latest.status_indicator = telemetry_state.get("statusIndicator", "red")
    latest.status_label = telemetry_state.get("statusLabel", "Moving")
    latest.current_station_id = telemetry_state.get("currentStation", {}).get("id") if telemetry_state.get("currentStation") else None
    latest.current_station_name = telemetry_state.get("currentStation", {}).get("name") if telemetry_state.get("currentStation") else None
    latest.next_station_id = telemetry_state.get("nextStation", {}).get("id") if telemetry_state.get("nextStation") else None
    latest.next_station_name = telemetry_state.get("nextStation", {}).get("name") if telemetry_state.get("nextStation") else None
    latest.distance_to_next_meters = telemetry_state.get("distanceToNextStationMeters", 0)
    latest.eta_minutes = telemetry_state.get("etaToNextStationMinutes", 0)
    latest.seconds_since_update = 0
    latest.gps_health = "active"
    latest.gps_health_label = "Live GPS Active (Updated 0s ago)"
    latest.is_simulated = is_simulated
    latest.last_updated = datetime.utcnow()

    # 6. Dispatch Notifications
    if events_generated:
        dispatch_station_notifications(db, events_generated)

    db.commit()

    # 7. Push Broadcast via SSE
    broadcast_data = {
        "type": "GPS_TELEMETRY_UPDATE",
        "bus": telemetry_state,
        "events": events_generated,
        "timestamp": int(time.time() * 1000)
    }
    await sse_manager.broadcast(broadcast_data)

    return {
        "success": True,
        "bus": telemetry_state,
        "events": events_generated
    }

@router.get("/live/buses")
def get_all_live_buses(db: Session = Depends(get_db)):
    """Returns current live operational status for all buses with GPS signal health."""
    buses = db.query(Bus).all()
    results = []
    now = datetime.utcnow()

    for b in buses:
        latest = db.query(BusLatestLocation).filter(BusLatestLocation.bus_id == b.id).first()
        secs_since = int(round((now - (latest.last_updated if latest and latest.last_updated else b.last_updated)).total_seconds())) if (latest or b.last_updated) else 999
        health, health_label = get_gps_health(secs_since)

        # Build telemetry record
        item = {
            "busId": b.id,
            "busNumber": b.bus_number,
            "plateNumber": b.plate_number,
            "routeId": b.route_id,
            "driverName": b.driver_name,
            "lat": latest.latitude if latest else b.current_lat,
            "lng": latest.longitude if latest else b.current_lng,
            "speedKmh": latest.speed if latest else b.current_speed,
            "heading": latest.heading if latest else 0.0,
            "accuracy": latest.accuracy if latest else 5.0,
            "lastUpdated": int((latest.last_updated.timestamp() * 1000)) if (latest and latest.last_updated) else int(time.time() * 1000),
            "status": latest.status if latest else "at_station",
            "statusIndicator": latest.status_indicator if latest else "green",
            "statusLabel": latest.status_label if latest else "At Station",
            "currentStation": {
                "id": latest.current_station_id,
                "name": latest.current_station_name
            } if (latest and latest.current_station_id) else None,
            "nextStation": {
                "id": latest.next_station_id,
                "name": latest.next_station_name
            } if (latest and latest.next_station_id) else None,
            "distanceToNextStationMeters": latest.distance_to_next_meters if latest else 0,
            "etaToNextStationMinutes": latest.eta_minutes if latest else 0,
            "secondsSinceUpdate": secs_since,
            "gpsHealth": health,
            "gpsHealthLabel": health_label,
            "isSimulated": latest.is_simulated if latest else False
        }
        results.append(item)

    return {"success": True, "buses": results, "timestamp": int(time.time() * 1000)}

@router.get("/live/history")
def get_live_history(
    busNumber: Optional[str] = None,
    busId: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Returns recent arrival and departure event log with optional bus filter."""
    query = db.query(ArrivalDepartureEvent)
    filter_val = None
    if isinstance(busNumber, str) and busNumber:
        filter_val = busNumber
    elif isinstance(busId, str) and busId:
        filter_val = busId

    if filter_val:
        query = query.filter(
            (ArrivalDepartureEvent.bus_number == filter_val.upper()) |
            (ArrivalDepartureEvent.bus_id == filter_val)
        )
    lim = limit if isinstance(limit, int) else 50
    events = query.order_by(ArrivalDepartureEvent.created_at.desc()).limit(lim).all()

    formatted = []
    for ev in events:
        formatted.append({
            "id": ev.id,
            "busNumber": ev.bus_number,
            "stationId": ev.station_id,
            "stationName": ev.station_name,
            "sequence": ev.sequence,
            "event": ev.event_type,
            "eventLabel": ev.event_type.capitalize(),
            "indicator": ev.indicator,
            "timeFormatted": ev.event_timestamp.strftime("%I:%M %p") if ev.event_timestamp else "",
            "timestamp": int(ev.event_timestamp.timestamp() * 1000) if ev.event_timestamp else int(time.time() * 1000),
            "speedKmh": ev.speed_kmh,
            "title": ev.title,
            "message": ev.message
        })

    return {"success": True, "history": formatted, "timestamp": int(time.time() * 1000)}

@router.get("/live/stream")
async def live_telemetry_sse_stream(db: Session = Depends(get_db)):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Transmits initial snapshot, real-time telemetry events, and periodic heartbeats.
    """
    client_queue = await sse_manager.connect()

    # Pre-generate initial snapshot
    all_buses = get_all_live_buses(db).get("buses", [])
    history_res = get_live_history(db=db).get("history", [])

    initial_payload = {
        "type": "INIT_SNAPSHOT",
        "buses": all_buses,
        "history": history_res,
        "timestamp": int(time.time() * 1000)
    }

    async def event_generator():
        try:
            # 1. Send initial snapshot
            yield f"data: {json.dumps(initial_payload)}\n\n"

            # 2. Stream real-time events or heartbeats
            while True:
                try:
                    payload = await asyncio.wait_for(client_queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping
                    yield ": heartbeat\n\n"
        except (asyncio.CancelledError, ConnectionResetError):
            pass
        finally:
            await sse_manager.disconnect(client_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/buses/{bus_id}/history")
def get_bus_gps_trail(
    bus_id: str,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Returns historical GPS coordinate trail for route playback."""
    records = db.query(GPSHistory).filter(
        GPSHistory.bus_id == bus_id,
        GPSHistory.is_valid == True
    ).order_by(GPSHistory.received_at.desc()).limit(limit).all()

    trail = [
        {
            "latitude": r.latitude,
            "longitude": r.longitude,
            "speed": r.speed,
            "heading": r.heading,
            "accuracy": r.accuracy,
            "timestamp": r.received_at.isoformat() + "Z",
            "isSimulated": r.is_simulated
        }
        for r in reversed(records)
    ]
    return {"success": True, "busId": bus_id, "count": len(trail), "trail": trail}
