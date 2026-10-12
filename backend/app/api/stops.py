from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.stop import Stop
from ..models.route import Route
from ..models.audit import AuditLog
from ..models.user import User
from ..schemas.stop import StopCreate, StopUpdate
from ..security.permissions import get_optional_user

router = APIRouter(tags=["Stops"])

@router.get("/stops")
def list_stops(db: Session = Depends(get_db)):
    stops = db.query(Stop).all()
    result = []
    for s in stops:
        route = db.query(Route).filter(Route.id == s.route_id).first()
        result.append({
            "id": s.id,
            "routeId": s.route_id,
            "routeName": route.name if route else "",
            "name": s.name,
            "shortName": s.short_name,
            "lat": s.lat,
            "lng": s.lng,
            "sequence": s.sequence,
            "scheduledTime": s.scheduled_time,
            "studentsWaiting": s.students_waiting,
            "isTerminal": s.is_terminal,
            "geofenceRadius": s.geofence_radius,
            "dwellSeconds": s.expected_dwell_seconds,
            "isActive": s.is_active
        })
    return {"success": True, "count": len(result), "stops": result}

@router.post("/stops")
def create_stop(
    payload: StopCreate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    lat = payload.lat if payload.lat is not None else payload.latitude
    lng = payload.lng if payload.lng is not None else payload.longitude

    if not payload.name or lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Stop name, latitude, and longitude are required")

    route = db.query(Route).filter(Route.id == payload.routeId).first() if payload.routeId else db.query(Route).first()
    if not route:
        raise HTTPException(status_code=404, detail="Target route not found")

    existing_stops_count = db.query(Stop).filter(Stop.route_id == route.id).count()
    new_id = payload.id or f"stop-{route.id}-{existing_stops_count + 1}"

    new_stop = Stop(
        id=new_id,
        route_id=route.id,
        name=payload.name,
        short_name=payload.shortName or payload.name.split(" ")[0],
        lat=float(lat),
        lng=float(lng),
        sequence=payload.sequence or (existing_stops_count + 1),
        scheduled_time=payload.scheduledTime or "07:30 AM",
        students_waiting=payload.studentsWaiting or 0,
        is_terminal=bool(payload.isTerminal),
        geofence_radius=payload.geofenceRadius or 60,
        expected_dwell_seconds=payload.dwellSeconds or 60,
        is_active=True
    )

    db.add(new_stop)
    db.commit()

    return {"success": True, "message": "Stop added successfully", "stop": new_stop}

@router.put("/stops/{stop_id}")
def update_stop(
    stop_id: str,
    payload: StopUpdate,
    db: Session = Depends(get_db)
):
    stop = db.query(Stop).filter(Stop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail=f"Stop with ID '{stop_id}' not found")

    if payload.name: stop.name = payload.name
    if payload.shortName: stop.short_name = payload.shortName
    if payload.lat is not None: stop.lat = payload.lat
    if payload.lng is not None: stop.lng = payload.lng
    if payload.sequence is not None: stop.sequence = payload.sequence
    if payload.scheduledTime: stop.scheduled_time = payload.scheduledTime
    if payload.studentsWaiting is not None: stop.students_waiting = payload.studentsWaiting
    if payload.isTerminal is not None: stop.is_terminal = payload.isTerminal
    if payload.geofenceRadius is not None: stop.geofence_radius = payload.geofenceRadius
    if payload.dwellSeconds is not None: stop.expected_dwell_seconds = payload.dwellSeconds
    if payload.isActive is not None: stop.is_active = payload.isActive

    db.commit()
    return {"success": True, "message": "Stop updated successfully", "stop": stop}

@router.delete("/stops/{stop_id}")
def delete_stop(
    stop_id: str,
    db: Session = Depends(get_db)
):
    stop = db.query(Stop).filter(Stop.id == stop_id).first()
    if not stop:
        raise HTTPException(status_code=404, detail=f"Stop with ID '{stop_id}' not found")

    name = stop.name
    db.delete(stop)
    db.commit()
    return {"success": True, "message": f"Stop '{name}' removed successfully"}
