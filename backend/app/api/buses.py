import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.bus import Bus
from ..models.route import Route
from ..models.audit import AuditLog
from ..models.user import User
from ..schemas.bus import BusCreate, BusUpdate
from ..security.permissions import require_admin, get_optional_user

router = APIRouter(tags=["Buses"])

@router.get("/buses")
def list_buses(db: Session = Depends(get_db)):
    buses = db.query(Bus).all()
    # Format according to frontend contract
    result = []
    for b in buses:
        result.append({
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
            "lastUpdated": b.last_updated.isoformat() + "Z" if b.last_updated else datetime.utcnow().isoformat() + "Z"
        })
    return {"success": True, "count": len(result), "buses": result}

@router.get("/buses/{bus_id}")
def get_bus_details(bus_id: str, db: Session = Depends(get_db)):
    b = db.query(Bus).filter(Bus.id == bus_id).first()
    if not b:
        raise HTTPException(status_code=404, detail=f"Bus with ID '{bus_id}' not found")
    return {
        "success": True,
        "bus": {
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
            "lastUpdated": b.last_updated.isoformat() + "Z" if b.last_updated else None
        }
    }

@router.post("/buses")
def create_bus(
    payload: BusCreate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not payload.busNumber:
        raise HTTPException(status_code=400, detail="Bus number is required")

    clean_num = "".join(c for c in payload.busNumber.lower() if c.isalnum()) or str(int(datetime.utcnow().timestamp()))
    new_id = payload.id or f"bus-{clean_num}"

    route = db.query(Route).filter(Route.id == payload.routeId).first() if payload.routeId else db.query(Route).first()

    existing = db.query(Bus).filter((Bus.id == new_id) | (Bus.bus_number == payload.busNumber.upper())).first()
    if existing:
        # Update existing
        existing.plate_number = payload.plateNumber or existing.plate_number
        existing.route_id = route.id if route else existing.route_id
        existing.route_name = route.name if route else existing.route_name
        existing.capacity = payload.capacity or existing.capacity
        existing.has_ac = payload.hasAC if payload.hasAC is not None else existing.has_ac
        existing.status_text = payload.statusText or existing.status_text
        existing.operational_status = payload.operationalStatus or existing.operational_status
        db.commit()
        return {"success": True, "message": "Bus updated successfully", "bus": existing}

    new_bus = Bus(
        id=new_id,
        bus_number=payload.busNumber.upper(),
        plate_number=payload.plateNumber or f"TN-11-DCE-{random.randint(1000, 9999)}",
        route_id=route.id if route else "route-07",
        route_name=route.name if route else "DCE Express",
        starting_point=payload.startingPoint or (route.origin if route else "Tambaram"),
        destination=payload.destination or (route.destination if route else "DCE Campus"),
        assigned_staff_id=payload.assignedStaffId or "staff-01",
        driver_name=payload.driverName or "DCE Bus Driver",
        driver_phone=payload.driverPhone or "+91 94440 00000",
        driver_rating=payload.driverRating or 4.8,
        bus_image=payload.busImage or "https://images.unsplash.com/photo-1618847791039-886c74c001ad?auto=format&fit=crop&q=80&w=800",
        capacity=payload.capacity or 50,
        current_occupancy=payload.currentOccupancy or 0,
        has_ac=payload.hasAC or False,
        is_live=True,
        is_active=True,
        status_text=payload.statusText or "In Service (Active)",
        operational_status=payload.operationalStatus or "In Service",
        current_lat=payload.currentLat or 12.9249,
        current_lng=payload.currentLng or 80.1165,
        current_speed=0.0,
        last_updated=datetime.utcnow()
    )

    db.add(new_bus)
    db.add(AuditLog(
        id=f"log-{int(datetime.utcnow().timestamp()*1000)}",
        user_id=current_user.id if current_user else "admin",
        user_name=current_user.name if current_user else "Administrator",
        action="BUS_ADDED",
        target=new_bus.bus_number,
        details=f"Added bus {new_bus.bus_number} on route {new_bus.route_name}"
    ))
    db.commit()

    return {"success": True, "message": "Bus created successfully", "bus": new_bus}

@router.put("/buses/{bus_id}")
def update_bus(
    bus_id: str,
    payload: BusUpdate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"Bus with ID '{bus_id}' not found")

    update_dict = payload.dict(exclude_unset=True)
    for k, v in update_dict.items():
        # Convert camelCase to snake_case
        snake_k = "".join([f"_{c.lower()}" if c.isupper() else c for c in k])
        if hasattr(bus, snake_k):
            setattr(bus, snake_k, v)

    bus.last_updated = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Bus updated successfully", "bus": bus}

@router.delete("/buses/{bus_id}")
def delete_bus(
    bus_id: str,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    bus = db.query(Bus).filter(Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"Bus with ID '{bus_id}' not found")

    num = bus.bus_number
    db.delete(bus)
    db.add(AuditLog(
        id=f"log-{int(datetime.utcnow().timestamp()*1000)}",
        user_id=current_user.id if current_user else "admin",
        user_name=current_user.name if current_user else "Administrator",
        action="BUS_DELETED",
        target=num,
        details=f"Removed bus {num} from fleet"
    ))
    db.commit()

    return {"success": True, "message": f"Bus {num} removed successfully"}
