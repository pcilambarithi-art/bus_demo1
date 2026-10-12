import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.route import Route
from ..models.stop import Stop
from ..models.audit import AuditLog
from ..models.user import User
from ..schemas.route import RouteCreate, RouteUpdate
from ..security.permissions import get_optional_user

router = APIRouter(tags=["Routes"])

@router.get("/routes")
def list_routes(db: Session = Depends(get_db)):
    routes = db.query(Route).all()
    result = []
    for r in routes:
        stops = db.query(Stop).filter(Stop.route_id == r.id).order_by(Stop.sequence.asc()).all()
        stops_list = [
            {
                "id": s.id,
                "name": s.name,
                "shortName": s.short_name,
                "lat": s.lat,
                "lng": s.lng,
                "sequence": s.sequence,
                "scheduledTime": s.scheduled_time,
                "studentsWaiting": s.students_waiting,
                "isTerminal": s.is_terminal,
                "routeId": s.route_id,
                "isActive": s.is_active
            }
            for s in stops
        ]

        assigned_bus_ids = json.loads(r.assigned_bus_ids or "[]")
        waypoints = json.loads(r.waypoints_json or "[]")

        result.append({
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "routeNumber": r.route_number,
            "origin": r.origin,
            "destination": r.destination,
            "startingPoint": r.starting_point,
            "description": r.description,
            "totalDistanceKm": r.total_distance_km,
            "estimatedTotalMinutes": r.estimated_total_minutes,
            "assignedBusIds": assigned_bus_ids,
            "stops": stops_list,
            "waypoints": waypoints,
            "isActive": r.is_active
        })

    return {"success": True, "count": len(result), "routes": result}

@router.get("/routes/{route_id}")
def get_route(route_id: str, db: Session = Depends(get_db)):
    r = db.query(Route).filter(Route.id == route_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Route with ID '{route_id}' not found")
    stops = db.query(Stop).filter(Stop.route_id == r.id).order_by(Stop.sequence.asc()).all()
    return {
        "success": True,
        "route": {
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "routeNumber": r.route_number,
            "origin": r.origin,
            "destination": r.destination,
            "totalDistanceKm": r.total_distance_km,
            "estimatedTotalMinutes": r.estimated_total_minutes,
            "stops": [
                {
                    "id": s.id,
                    "name": s.name,
                    "shortName": s.short_name,
                    "lat": s.lat,
                    "lng": s.lng,
                    "sequence": s.sequence,
                    "scheduledTime": s.scheduled_time,
                    "isTerminal": s.is_terminal
                }
                for s in stops
            ]
        }
    }

@router.post("/routes")
def create_route(
    payload: RouteCreate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not payload.name:
        raise HTTPException(status_code=400, detail="Route name is required")

    routes_count = db.query(Route).count()
    new_id = payload.id or f"route-{int(datetime.utcnow().timestamp()*1000)}"
    code = payload.code or f"R-{routes_count + 1:02d}"

    waypoints = payload.waypoints or []
    if not waypoints and payload.stops:
        waypoints = [[s.get("lat"), s.get("lng")] for s in payload.stops if s.get("lat") and s.get("lng")]

    new_route = Route(
        id=new_id,
        name=payload.name,
        code=code,
        route_number=payload.routeNumber or str(routes_count + 1),
        origin=payload.origin or "Tambaram",
        destination=payload.destination or "DCE Campus, Manimangalam",
        starting_point=payload.startingPoint or (payload.origin or "Tambaram"),
        description=payload.description or f"Route {payload.name}",
        total_distance_km=payload.totalDistanceKm or 15.0,
        estimated_total_minutes=payload.estimatedTotalMinutes or 35,
        assigned_bus_ids=json.dumps(payload.assignedBusIds or []),
        waypoints_json=json.dumps(waypoints),
        is_active=True
    )

    db.add(new_route)

    # Add stops if provided
    for idx, s in enumerate(payload.stops or []):
        stop_id = s.get("id") or f"stop-{new_id}-{idx+1}"
        db.add(Stop(
            id=stop_id,
            route_id=new_id,
            name=s.get("name"),
            short_name=s.get("shortName", s.get("name", "").split(" ")[0]),
            lat=float(s.get("lat", 12.9249)),
            lng=float(s.get("lng", 80.1165)),
            sequence=int(s.get("sequence", idx + 1)),
            scheduled_time=s.get("scheduledTime", "07:30 AM"),
            is_terminal=bool(s.get("isTerminal", False))
        ))

    db.commit()
    return {"success": True, "message": "Route created successfully", "route": new_route}

@router.put("/routes/{route_id}")
def update_route(
    route_id: str,
    payload: RouteUpdate,
    db: Session = Depends(get_db)
):
    r = db.query(Route).filter(Route.id == route_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Route with ID '{route_id}' not found")

    if payload.name: r.name = payload.name
    if payload.code: r.code = payload.code
    if payload.origin: r.origin = payload.origin
    if payload.destination: r.destination = payload.destination
    if payload.description is not None: r.description = payload.description
    if payload.totalDistanceKm: r.total_distance_km = payload.totalDistanceKm
    if payload.estimatedTotalMinutes: r.estimated_total_minutes = payload.estimatedTotalMinutes
    if payload.assignedBusIds is not None: r.assigned_bus_ids = json.dumps(payload.assignedBusIds)
    if payload.waypoints is not None: r.waypoints_json = json.dumps(payload.waypoints)
    if payload.isActive is not None: r.is_active = payload.isActive

    db.commit()
    return {"success": True, "message": "Route updated successfully", "route": r}
