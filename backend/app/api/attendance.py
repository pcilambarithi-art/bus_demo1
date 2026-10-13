import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.attendance import Student, AttendanceRecord
from ..models.bus import Bus
from ..models.stop import Stop
from ..models.audit import AuditLog
from ..models.user import User
from ..schemas.attendance import (
    StudentCreateRequest,
    AttendanceTapRequest,
    AttendanceBatchSyncRequest,
    AttendanceCorrectionRequest
)
from ..security.permissions import verify_device_credentials, get_optional_user
from ..services.live_updates import sse_manager

router = APIRouter(tags=["Student Attendance & RFID/QR Verification"])


def _serialize_student(s: Student) -> dict:
    try:
        buses = json.loads(s.permitted_bus_ids) if s.permitted_bus_ids else []
    except Exception:
        buses = ["bus-07"]
    try:
        routes = json.loads(s.permitted_route_ids) if s.permitted_route_ids else []
    except Exception:
        routes = ["route-07"]

    return {
        "id": s.id,
        "name": s.name,
        "department": s.department,
        "batch": s.batch,
        "rfidUid": s.rfid_uid,
        "qrToken": s.qr_token,
        "permittedBusIds": buses,
        "permittedRouteIds": routes,
        "designatedStopId": s.designated_stop_id,
        "designatedStopName": s.designated_stop_name,
        "parentPhone": s.parent_phone,
        "isActive": s.is_active
    }


def _serialize_attendance(r: AttendanceRecord) -> dict:
    return {
        "id": r.id,
        "studentId": r.student_id,
        "studentName": r.student_name,
        "department": r.department,
        "busId": r.bus_id,
        "busNumber": r.bus_number,
        "routeId": r.route_id,
        "stopId": r.stop_id,
        "stopName": r.stop_name,
        "eventType": r.event_type,
        "deviceId": r.device_id,
        "timestamp": int(r.timestamp.timestamp() * 1000) if r.timestamp else int(time.time() * 1000),
        "timestampIso": r.timestamp.isoformat() + "Z" if r.timestamp else "",
        "syncStatus": r.sync_status,
        "isAuthorized": r.is_authorized,
        "remarks": r.remarks
    }


def _process_single_tap(
    db: Session,
    tap: AttendanceTapRequest,
    default_sync_status: str = "REALTIME"
) -> tuple[AttendanceRecord, bool, str]:
    """
    Processes a single RFID/QR tap with deterministic event ID deduplication
    and a 5-minute anti-passback cooldown window.
    Returns (record, is_duplicate, message).
    """
    # 1. Check exact deterministic eventId idempotency first
    if tap.eventId:
        existing_by_id = db.query(AttendanceRecord).filter(AttendanceRecord.id == tap.eventId).first()
        if existing_by_id:
            return existing_by_id, True, "Event ID already synchronized (idempotent skip)"

    # 2. Resolve Student by Roll ID, RFID UID, or QR Token
    ident = tap.studentIdentifier.strip()
    student = db.query(Student).filter(
        (Student.id == ident) |
        (Student.rfid_uid == ident) |
        (Student.qr_token == ident)
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unregistered student credential or card UID: {ident}"
        )

    if not student.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Student {student.id} ({student.name}) transport pass is currently inactive"
        )

    # 3. Resolve Bus
    bus = db.query(Bus).filter((Bus.id == tap.busId) | (Bus.bus_number == tap.busId.upper())).first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus '{tap.busId}' not found"
        )

    event_time = datetime.fromtimestamp(tap.timestamp / 1000.0) if tap.timestamp else datetime.utcnow()
    event_type = (tap.eventType or "BOARDING").upper()
    if event_type not in ("BOARDING", "EXIT"):
        event_type = "BOARDING"

    # 4. Anti-Passback / Cooldown Check (5 minutes window for same student + bus + event_type)
    window_start = event_time - timedelta(minutes=5)
    window_end = event_time + timedelta(minutes=5)
    recent_dup = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.bus_id == bus.id,
        AttendanceRecord.event_type == event_type,
        AttendanceRecord.timestamp >= window_start,
        AttendanceRecord.timestamp <= window_end
    ).first()

    if recent_dup:
        return recent_dup, True, "Duplicate tap ignored within 5-minute cooldown window"

    # 5. Verify route/bus authorization
    try:
        permitted_buses = json.loads(student.permitted_bus_ids) if student.permitted_bus_ids else []
    except Exception:
        permitted_buses = []

    is_authorized = (bus.id in permitted_buses) or (bus.bus_number in permitted_buses)
    remarks = "Verified on permitted bus" if is_authorized else f"WARNING: Student permitted on {permitted_buses}, boarded {bus.bus_number}"

    # 6. Resolve stop name if stopId provided
    stop_name = tap.stopName
    if not stop_name and tap.stopId:
        st = db.query(Stop).filter(Stop.id == tap.stopId).first()
        if st:
            stop_name = st.name
    if not stop_name:
        stop_name = student.designated_stop_name or "On Route"

    record_id = tap.eventId or f"att-{bus.id}-{student.id.lower()}-{int(event_time.timestamp())}-{uuid.uuid4().hex[:4]}"
    record = AttendanceRecord(
        id=record_id,
        student_id=student.id,
        student_name=student.name,
        department=student.department,
        bus_id=bus.id,
        bus_number=bus.bus_number,
        route_id=tap.routeId or bus.route_id or "route-07",
        stop_id=tap.stopId or student.designated_stop_id,
        stop_name=stop_name,
        event_type=event_type,
        device_id=tap.deviceId or f"pi-{bus.id}",
        timestamp=event_time,
        sync_status=tap.syncStatus or default_sync_status,
        is_authorized=is_authorized,
        remarks=remarks,
        created_at=datetime.utcnow()
    )
    db.add(record)

    # 7. Update Bus Live Occupancy
    if event_type == "BOARDING":
        bus.current_occupancy = min(bus.capacity or 50, (bus.current_occupancy or 0) + 1)
    elif event_type == "EXIT":
        bus.current_occupancy = max(0, (bus.current_occupancy or 0) - 1)

    db.commit()
    db.refresh(record)
    return record, False, "Attendance recorded"


@router.get("/students")
def list_students(
    busId: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists registered students and their RFID/QR transport pass assignments."""
    query = db.query(Student)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (Student.name.ilike(pattern)) |
            (Student.id.ilike(pattern)) |
            (Student.rfid_uid.ilike(pattern))
        )
    students = query.order_by(Student.id.asc()).all()
    results = [_serialize_student(s) for s in students]
    if busId:
        results = [s for s in results if busId in s["permittedBusIds"]]
    return {"success": True, "students": results, "total": len(results)}


@router.post("/students")
def register_student(
    payload: StudentCreateRequest,
    db: Session = Depends(get_db)
):
    """Registers or updates a student RFID/QR transport credential."""
    existing = db.query(Student).filter(Student.id == payload.id).first()
    if existing:
        existing.name = payload.name
        existing.department = payload.department or existing.department
        existing.batch = payload.batch or existing.batch
        if payload.rfidUid:
            existing.rfid_uid = payload.rfidUid
        if payload.qrToken:
            existing.qr_token = payload.qrToken
        existing.permitted_bus_ids = json.dumps(payload.permittedBusIds)
        existing.permitted_route_ids = json.dumps(payload.permittedRouteIds)
        existing.designated_stop_id = payload.designatedStopId
        existing.designated_stop_name = payload.designatedStopName or existing.designated_stop_name
        existing.parent_phone = payload.parentPhone or existing.parent_phone
        db.commit()
        db.refresh(existing)
        return {"success": True, "student": _serialize_student(existing), "updated": True}

    new_student = Student(
        id=payload.id,
        name=payload.name,
        department=payload.department or "Computer Science & Engineering",
        batch=payload.batch or "2022-2026",
        rfid_uid=payload.rfidUid or f"RFID-{uuid.uuid4().hex[:8].upper()}",
        qr_token=payload.qrToken or f"QR-{payload.id}-{uuid.uuid4().hex[:6].upper()}",
        permitted_bus_ids=json.dumps(payload.permittedBusIds),
        permitted_route_ids=json.dumps(payload.permittedRouteIds),
        designated_stop_id=payload.designatedStopId,
        designated_stop_name=payload.designatedStopName or "Tambaram West Stand",
        parent_phone=payload.parentPhone or "",
        is_active=True
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return {"success": True, "student": _serialize_student(new_student), "updated": False}


@router.post("/attendance/tap")
async def record_attendance_tap(
    payload: AttendanceTapRequest,
    x_device_id: Optional[str] = Header(None),
    x_device_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Records a real-time RFID card tap or QR scan from a bus agent or staff scanner.
    Enforces device-to-bus binding when device headers are present.
    """
    verify_device_credentials(db, x_device_id, x_device_key, target_bus_id=payload.busId, require_strict=False)

    record, is_dup, msg = _process_single_tap(db, payload, default_sync_status="REALTIME")
    serialized = _serialize_attendance(record)

    if not is_dup:
        await sse_manager.broadcast({
            "type": "ATTENDANCE_UPDATE",
            "attendance": serialized,
            "timestamp": int(time.time() * 1000)
        })

    return {
        "success": True,
        "duplicate": is_dup,
        "message": msg,
        "attendance": serialized
    }


@router.post("/attendance/batch")
async def sync_attendance_batch(
    payload: AttendanceBatchSyncRequest,
    x_device_id: Optional[str] = Header(None),
    x_device_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Synchronizes queued offline attendance records from a Raspberry Pi 5 bus agent
    after 4G reconnection. Returns per-record acknowledgements so the Pi agent
    can purge acknowledged events from its local SQLite queue without data loss.
    """
    eff_device_id = x_device_id or payload.deviceId
    verify_device_credentials(db, eff_device_id, x_device_key, target_bus_id=payload.busId, require_strict=bool(x_device_key))

    synced_ids = []
    duplicate_ids = []
    failed_items = []

    for item in payload.records:
        try:
            item.busId = payload.busId
            item.deviceId = payload.deviceId
            item.syncStatus = "OFFLINE_SYNCED"
            rec, is_dup, _ = _process_single_tap(db, item, default_sync_status="OFFLINE_SYNCED")
            ack_id = item.eventId or rec.id
            if is_dup:
                duplicate_ids.append(ack_id)
            else:
                synced_ids.append(ack_id)
        except HTTPException as he:
            failed_items.append({"eventId": item.eventId, "error": he.detail})
        except Exception as e:
            failed_items.append({"eventId": item.eventId, "error": str(e)})

    if synced_ids:
        await sse_manager.broadcast({
            "type": "ATTENDANCE_BATCH_SYNCED",
            "deviceId": payload.deviceId,
            "busId": payload.busId,
            "syncedCount": len(synced_ids),
            "timestamp": int(time.time() * 1000)
        })

    return {
        "success": True,
        "deviceId": payload.deviceId,
        "busId": payload.busId,
        "syncedCount": len(synced_ids),
        "duplicateCount": len(duplicate_ids),
        "failedCount": len(failed_items),
        "acknowledgedEventIds": synced_ids + duplicate_ids,
        "failed": failed_items
    }


@router.get("/attendance/logs")
def get_attendance_logs(
    busId: Optional[str] = Query(None),
    studentId: Optional[str] = Query(None),
    eventType: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Returns chronological student boarding and exit records."""
    query = db.query(AttendanceRecord)
    if busId:
        query = query.filter((AttendanceRecord.bus_id == busId) | (AttendanceRecord.bus_number == busId.upper()))
    if studentId:
        query = query.filter(AttendanceRecord.student_id == studentId)
    if eventType:
        query = query.filter(AttendanceRecord.event_type == eventType.upper())

    records = query.order_by(AttendanceRecord.timestamp.desc()).limit(limit).all()
    return {
        "success": True,
        "logs": [_serialize_attendance(r) for r in records],
        "count": len(records)
    }


@router.get("/attendance/report")
def get_attendance_report(db: Session = Depends(get_db)):
    """Generates an administrative attendance summary across buses, routes, and departments."""
    all_records = db.query(AttendanceRecord).all()
    total_students = db.query(Student).filter(Student.is_active == True).count()

    boardings = [r for r in all_records if r.event_type == "BOARDING"]
    exits = [r for r in all_records if r.event_type == "EXIT"]
    unauthorized = [r for r in all_records if not r.is_authorized]
    offline_synced = [r for r in all_records if r.sync_status == "OFFLINE_SYNCED"]

    by_bus = {}
    for r in all_records:
        b_key = r.bus_number or r.bus_id
        if b_key not in by_bus:
            by_bus[b_key] = {"busNumber": b_key, "busId": r.bus_id, "boardings": 0, "exits": 0, "unauthorized": 0}
        if r.event_type == "BOARDING":
            by_bus[b_key]["boardings"] += 1
        else:
            by_bus[b_key]["exits"] += 1
        if not r.is_authorized:
            by_bus[b_key]["unauthorized"] += 1

    return {
        "success": True,
        "summary": {
            "totalRegisteredStudents": total_students,
            "totalEvents": len(all_records),
            "totalBoardings": len(boardings),
            "totalExits": len(exits),
            "unauthorizedBoardings": len(unauthorized),
            "offlineSyncedEvents": len(offline_synced),
            "busBreakdown": list(by_bus.values())
        }
    }


@router.put("/attendance/{record_id}/correct")
def correct_attendance_record(
    record_id: str,
    payload: AttendanceCorrectionRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Allows an administrator to securely correct an attendance mistake
    (e.g. accidental exit scan, wrong stop, or special route permission)
    while recording an immutable audit log.
    """
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    if payload.eventType:
        record.event_type = payload.eventType.upper()
    if payload.stopName:
        record.stop_name = payload.stopName
    if payload.isAuthorized is not None:
        record.is_authorized = payload.isAuthorized

    record.remarks = payload.remarks
    record.sync_status = "MANUAL_CORRECTED"

    actor_name = current_user.name if current_user else "DCE Transport Administrator"
    db.add(AuditLog(
        id=f"audit-att-{uuid.uuid4().hex[:10]}",
        user_id=current_user.id if current_user else "admin-01",
        user_name=actor_name,
        action="ATTENDANCE_CORRECTION",
        target=f"AttendanceRecord:{record.id}",
        details=f"Corrected record for {record.student_id}: {payload.remarks}"
    ))
    db.commit()
    db.refresh(record)


    return {
        "success": True,
        "message": "Attendance record updated and logged in audit trail",
        "attendance": _serialize_attendance(record)
    }
