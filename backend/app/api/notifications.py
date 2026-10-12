from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.notification import VoiceAnnouncement, IssueReport
from ..models.bus import Bus
from ..models.audit import AuditLog
from ..models.user import User
from ..schemas.notification import AnnouncementCreate, AnnouncementUpdate, IssueReportCreate, IssueReportUpdate
from ..schemas.bus import BusStatusUpdateRequest
from ..security.permissions import get_optional_user

router = APIRouter(tags=["Notifications & Announcements"])

# 1. Voice Announcements
@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db)):
    items = db.query(VoiceAnnouncement).all()
    formatted = [
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
        for a in items
    ]
    return {"success": True, "count": len(formatted), "announcements": formatted}

@router.post("/announcements")
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db)
):
    msg_text = payload.text or payload.message
    if not msg_text:
        raise HTTPException(status_code=400, detail="Announcement text is required")

    new_id = payload.id or f"va-{int(datetime.utcnow().timestamp()*1000)}"
    new_ann = VoiceAnnouncement(
        id=new_id,
        route_id=payload.routeId or "route-07",
        stop_id=payload.stopId or "stop-07-3",
        stop_name=payload.stopName or "Tambaram West Stand",
        text=msg_text,
        text_tamil=payload.textTamil or "",
        language=payload.language or "en-IN",
        audio_url=payload.audioUrl or "",
        trigger_distance_meters=payload.triggerDistanceMeters or 300,
        is_active=bool(payload.isActive) if payload.isActive is not None else True,
        created_at=datetime.utcnow()
    )
    db.add(new_ann)
    db.commit()
    return {"success": True, "message": "Voice announcement configured successfully", "announcement": new_ann}

@router.put("/announcements/{ann_id}")
def update_announcement(
    ann_id: str,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db)
):
    ann = db.query(VoiceAnnouncement).filter(VoiceAnnouncement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if payload.text: ann.text = payload.text
    if payload.textTamil is not None: ann.text_tamil = payload.textTamil
    if payload.routeId: ann.route_id = payload.routeId
    if payload.stopId: ann.stop_id = payload.stopId
    if payload.stopName: ann.stop_name = payload.stopName
    if payload.triggerDistanceMeters is not None: ann.trigger_distance_meters = payload.triggerDistanceMeters
    if payload.isActive is not None: ann.is_active = payload.isActive

    db.commit()
    return {"success": True, "message": "Voice announcement updated", "announcement": ann}

@router.delete("/announcements/{ann_id}")
def delete_announcement(
    ann_id: str,
    db: Session = Depends(get_db)
):
    ann = db.query(VoiceAnnouncement).filter(VoiceAnnouncement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return {"success": True, "message": "Announcement removed successfully"}

# 2. Issues Reporting
@router.post("/staff/issues")
def create_issue_report(
    payload: IssueReportCreate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    new_issue = IssueReport(
        id=f"issue-{int(datetime.utcnow().timestamp()*1000)}",
        staff_id=current_user.id if current_user else "staff-01",
        staff_name=current_user.name if current_user else "Bus Driver",
        bus_id=payload.busId or "bus-07",
        bus_number=payload.busNumber or "DCE-BUS-07",
        route_id=payload.routeId or "route-07",
        issue_type=payload.issueType or "Mechanical Problem",
        description=payload.description,
        location=payload.location or "On Route",
        latitude=str(payload.latitude) if payload.latitude else None,
        longitude=str(payload.longitude) if payload.longitude else None,
        priority=payload.priority or "Medium",
        status="New",
        photo_url=payload.photoUrl or "",
        created_at=datetime.utcnow()
    )
    db.add(new_issue)
    db.commit()
    return {"success": True, "message": "Issue reported to transport management", "issue": new_issue}

@router.get("/staff/issues")
def list_staff_issues(
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    query = db.query(IssueReport)
    if current_user and current_user.role in ("driver", "staff"):
        query = query.filter(IssueReport.staff_id == current_user.id)
    issues = query.order_by(IssueReport.created_at.desc()).all()
    return {"success": True, "count": len(issues), "issues": issues}

@router.get("/admin/issues")
def list_admin_issues(db: Session = Depends(get_db)):
    issues = db.query(IssueReport).order_by(IssueReport.created_at.desc()).all()
    return {"success": True, "count": len(issues), "issues": issues}

@router.put("/admin/issues/{issue_id}")
def update_admin_issue(
    issue_id: str,
    payload: IssueReportUpdate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    issue = db.query(IssueReport).filter(IssueReport.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue report not found")

    if payload.status: issue.status = payload.status
    if payload.adminRemarks is not None: issue.admin_remarks = payload.adminRemarks
    if payload.priority: issue.priority = payload.priority
    issue.updated_at = datetime.utcnow()

    db.add(AuditLog(
        id=f"log-{int(datetime.utcnow().timestamp()*1000)}",
        user_id=current_user.id if current_user else "admin",
        user_name=current_user.name if current_user else "Administrator",
        action="ISSUE_UPDATED",
        target=issue.bus_number,
        details=f"Updated issue {issue.id} status to '{issue.status}'"
    ))
    db.commit()
    return {"success": True, "message": "Issue status updated", "issue": issue}

# 3. Staff Bus Status Update
@router.post("/staff/bus-status")
@router.put("/staff/bus-status")
def update_staff_bus_status(
    payload: BusStatusUpdateRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    target_bus = None
    if payload.busId:
        target_bus = db.query(Bus).filter(Bus.id == payload.busId).first()
    if not target_bus and payload.busNumber:
        target_bus = db.query(Bus).filter(Bus.bus_number == payload.busNumber.upper()).first()
    if not target_bus and current_user and current_user.assigned_bus_id:
        target_bus = db.query(Bus).filter(Bus.id == current_user.assigned_bus_id).first()
    if not target_bus:
        target_bus = db.query(Bus).first()

    if not target_bus:
        raise HTTPException(status_code=404, detail="Assigned bus not found")

    target_bus.operational_status = payload.status or "On Route"
    target_bus.status_text = payload.statusText or f"{payload.status} (Updated by Driver)"
    target_bus.last_updated = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Bus status updated successfully", "bus": target_bus}
