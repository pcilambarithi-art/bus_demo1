from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.audit import AuditLog
from ..schemas.user import StaffCreateRequest, StaffUpdateRequest
from ..security.authentication import hash_password
from ..security.permissions import get_optional_user

router = APIRouter(tags=["Admin Management & Audit"])

@router.get("/staff")
def list_staff(db: Session = Depends(get_db)):
    staff = db.query(User).filter(User.role.in_(["driver", "staff"])).all()
    formatted = [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "phone": s.phone,
            "role": s.role,
            "assignedBusId": s.assigned_bus_id,
            "assignedRouteId": s.assigned_route_id,
            "status": "active" if s.is_active else "inactive",
            "lastActive": s.last_login.isoformat() + "Z" if s.last_login else ""
        }
        for s in staff
    ]
    return {"success": True, "count": len(formatted), "staff": formatted}

@router.post("/staff")
def create_staff(
    payload: StaffCreateRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not payload.name or not payload.email:
        raise HTTPException(status_code=400, detail="Staff name and email are required")

    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Staff with email '{payload.email}' already exists")

    new_staff = User(
        id=f"staff-{int(datetime.utcnow().timestamp()*1000)}",
        name=payload.name,
        email=payload.email.lower(),
        phone=payload.phone or "",
        role=payload.role or "driver",
        assigned_bus_id=payload.assignedBusId or "bus-07",
        assigned_route_id=payload.assignedRouteId or "route-07",
        password_hash=hash_password(payload.password or "dce2024"),
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_staff)
    db.add(AuditLog(
        id=f"log-{int(datetime.utcnow().timestamp()*1000)}",
        user_id=current_user.id if current_user else "admin",
        user_name=current_user.name if current_user else "Administrator",
        action="STAFF_REGISTERED",
        target=new_staff.name,
        details=f"Registered driver {new_staff.name} ({new_staff.email})"
    ))
    db.commit()

    return {"success": True, "message": "Staff member added successfully", "staff": new_staff}

@router.put("/staff/{staff_id}")
def update_staff(
    staff_id: str,
    payload: StaffUpdateRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    staff = db.query(User).filter(User.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    if payload.name: staff.name = payload.name
    if payload.email: staff.email = payload.email.lower()
    if payload.phone is not None: staff.phone = payload.phone
    if payload.role: staff.role = payload.role
    if payload.assignedBusId: staff.assigned_bus_id = payload.assignedBusId
    if payload.assignedRouteId: staff.assigned_route_id = payload.assignedRouteId
    if payload.password: staff.password_hash = hash_password(payload.password)
    if payload.status: staff.is_active = (payload.status == "active")

    db.add(AuditLog(
        id=f"log-{int(datetime.utcnow().timestamp()*1000)}",
        user_id=current_user.id if current_user else "admin",
        user_name=current_user.name if current_user else "Administrator",
        action="STAFF_UPDATED",
        target=staff.name,
        details=f"Updated profile for staff {staff.name}"
    ))
    db.commit()

    return {"success": True, "message": "Staff updated successfully", "staff": staff}

@router.get("/admin/activity-logs")
def list_activity_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    formatted = [
        {
            "id": l.id,
            "adminId": l.user_id,
            "adminName": l.user_name,
            "action": l.action,
            "target": l.target,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() + "Z" if l.timestamp else ""
        }
        for l in logs
    ]
    return {"success": True, "count": len(formatted), "logs": formatted}
