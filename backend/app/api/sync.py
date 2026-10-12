import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.bus import Bus
from ..models.route import Route
from ..models.stop import Stop
from ..models.user import User
from ..models.notification import VoiceAnnouncement, IssueReport
from .gps import get_all_live_buses, get_live_history

router = APIRouter(tags=["Fleet Sync"])

@router.get("/sync")
def sync_fleet_state(db: Session = Depends(get_db)):
    """
    Central bootstrap endpoint returning the Single Source of Truth snapshot
    for web clients, driver dashboards, and mobile devices.
    """
    # 1. Fetch Buses
    buses = db.query(Bus).all()
    buses_list = []
    for b in buses:
        buses_list.append({
            "id": b.id,
            "busNumber": b.bus_number,
            "plateNumber": b.plate_number,
            "routeId": b.route_id,
            "routeName": b.route_name,
            "startingPoint": b.starting_point,
            "destination": b.destination,
            "assignedStaffId": b.assigned_staff_id,
            "driverName": b.driver_name,
            "driverPhone": b.driver_phone,
            "driverRating": b.driver_rating,
            "busImage": b.bus_image,
            "capacity": b.capacity,
            "currentOccupancy": b.current_occupancy,
            "hasAC": b.has_ac,
            "isLive": b.is_live,
            "isActive": b.is_active,
            "statusText": b.status_text,
            "operationalStatus": b.operational_status,
            "currentLat": b.current_lat,
            "currentLng": b.current_lng,
            "currentSpeed": b.current_speed,
            "lastUpdated": b.last_updated.isoformat() + "Z" if b.last_updated else ""
        })

    # 2. Fetch Routes & Stops
    routes = db.query(Route).all()
    all_stops_flat = []
    routes_list = []

    for r in routes:
        stops = db.query(Stop).filter(Stop.route_id == r.id).order_by(Stop.sequence.asc()).all()
        stops_list = []
        for s in stops:
            stop_dict = {
                "id": s.id,
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
                "routeId": r.id,
                "routeName": r.name,
                "isActive": s.is_active
            }
            stops_list.append(stop_dict)
            all_stops_flat.append(stop_dict)

        routes_list.append({
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
            "assignedBusIds": json.loads(r.assigned_bus_ids or "[]"),
            "stops": stops_list,
            "waypoints": json.loads(r.waypoints_json or "[]"),
            "isActive": r.is_active
        })

    # 3. Live Telemetry & History
    live_buses = get_all_live_buses(db).get("buses", [])
    history = get_live_history(limit=50, db=db).get("history", [])

    # 4. Announcements & Active Issues
    announcements = db.query(VoiceAnnouncement).filter(VoiceAnnouncement.is_active == True).all()
    ann_list = [
        {
            "id": a.id,
            "routeId": a.route_id,
            "stopId": a.stop_id,
            "stopName": a.stop_name,
            "text": a.text,
            "textTamil": a.text_tamil,
            "language": a.language,
            "audioUrl": a.audio_url,
            "triggerDistanceMeters": a.trigger_distance_meters,
            "isActive": a.is_active,
            "createdAt": a.created_at.isoformat() + "Z" if a.created_at else ""
        }
        for a in announcements
    ]

    active_issues = db.query(IssueReport).filter(
        ~IssueReport.status.in_(["Resolved", "Closed"])
    ).order_by(IssueReport.created_at.desc()).all()

    active_staff_count = db.query(User).filter(User.role.in_(["driver", "staff"]), User.is_active == True).count()

    return {
        "success": True,
        "buses": buses_list,
        "routes": routes_list,
        "stops": all_stops_flat,
        "liveTelemetry": live_buses,
        "notificationHistory": history,
        "announcements": ann_list,
        "activeIssues": active_issues,
        "systemHealth": {
            "status": "ONLINE",
            "activeBuses": len([b for b in buses_list if b.get("isActive")]),
            "activeStaff": active_staff_count or 4,
            "lastSyncedAt": datetime.utcnow().isoformat() + "Z",
            "sourceOfTruth": "DCE Central Transit Cloud Server v2.5 (FastAPI SQLite Live Engine)"
        }
    }
