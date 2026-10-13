import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.attendance import Student, AttendanceRecord
from ..models.face_attendance import FaceEnrollment, AttendanceSession, FaceVerificationLog
from ..models.bus import Bus
from ..models.stop import Stop
from ..models.audit import AuditLog
from ..models.user import User
from ..schemas.attendance import (
    StudentCreateRequest,
    AttendanceSessionCreateRequest,
    FaceEnrollmentRequest,
    FaceVerificationRequest,
    AttendanceReviewRequest,
    AttendanceTapRequest,
    AttendanceBatchSyncRequest,
    AttendanceCorrectionRequest
)
from ..security.permissions import verify_device_credentials, get_optional_user
from ..services.face_service import face_service, FaceQualityError
from ..services.live_updates import sse_manager

router = APIRouter(tags=["Face Biometric & RFID/QR Student Attendance"])


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
        "rollNumber": s.roll_number or s.id,
        "name": s.name,
        "email": s.email or "",
        "department": s.department,
        "yearOfStudy": s.year_of_study or 3,
        "batch": s.batch,
        "section": s.section or "A",
        "rfidUid": s.rfid_uid,
        "qrToken": s.qr_token,
        "permittedBusIds": buses,
        "permittedRouteIds": routes,
        "designatedStopId": s.designated_stop_id,
        "designatedStopName": s.designated_stop_name,
        "faceEnrolled": bool(s.face_enrolled),
        "parentPhone": s.parent_phone,
        "isActive": s.is_active
    }


def _serialize_enrollment(e: FaceEnrollment) -> dict:
    """Serializes FaceEnrollment metadata WITHOUT ever exposing encrypted_template or raw vectors."""
    return {
        "id": e.id,
        "studentId": e.student_id,
        "studentName": e.student_name,
        "department": e.department,
        "enrollmentStatus": e.enrollment_status,
        "templateVersion": e.template_version,
        "templateHashPrefix": e.template_hash[:12] if e.template_hash else "",
        "sampleCount": e.sample_count,
        "averageQualityScore": e.average_quality_score,
        "brightnessScore": e.brightness_score,
        "sharpnessScore": e.sharpness_score,
        "consentGranted": e.consent_granted,
        "consentTimestamp": e.consent_timestamp.isoformat() + "Z" if e.consent_timestamp else "",
        "enrolledById": e.enrolled_by_id,
        "enrolledByName": e.enrolled_by_name,
        "createdAt": e.created_at.isoformat() + "Z" if e.created_at else "",
        "updatedAt": e.updated_at.isoformat() + "Z" if e.updated_at else "",
    }


def _serialize_session(sess: AttendanceSession) -> dict:
    return {
        "id": sess.id,
        "sessionName": sess.session_name,
        "sessionType": sess.session_type,
        "status": sess.status,
        "busId": sess.bus_id,
        "routeId": sess.route_id,
        "tripId": sess.trip_id,
        "department": sess.department,
        "subjectOrStop": sess.subject_or_stop,
        "createdById": sess.created_by_id,
        "createdByName": sess.created_by_name,
        "similarityThreshold": sess.similarity_threshold,
        "requireLiveness": sess.require_liveness,
        "startedAt": sess.started_at.isoformat() + "Z" if sess.started_at else "",
        "endedAt": sess.ended_at.isoformat() + "Z" if sess.ended_at else None,
        "totalVerified": sess.total_verified or 0,
        "totalRejected": sess.total_rejected or 0,
    }


def _serialize_attendance(r: AttendanceRecord) -> dict:
    return {
        "id": r.id,
        "sessionId": r.session_id,
        "studentId": r.student_id,
        "studentName": r.student_name,
        "department": r.department,
        "busId": r.bus_id,
        "busNumber": r.bus_number,
        "routeId": r.route_id,
        "stopId": r.stop_id,
        "stopName": r.stop_name,
        "eventType": r.event_type,
        "verificationMethod": r.verification_method or "RFID_CARD",
        "confidenceScore": r.confidence_score,
        "livenessPassed": r.liveness_passed if r.liveness_passed is not None else True,
        "livenessScore": r.liveness_score,
        "verificationStatus": r.verification_status or "VERIFIED",
        "latitude": r.latitude,
        "longitude": r.longitude,
        "deviceId": r.device_id,
        "timestamp": int(r.timestamp.timestamp() * 1000) if r.timestamp else int(time.time() * 1000),
        "timestampIso": r.timestamp.isoformat() + "Z" if r.timestamp else "",
        "syncStatus": r.sync_status,
        "isAuthorized": r.is_authorized,
        "reviewedById": r.reviewed_by_id,
        "reviewedByName": r.reviewed_by_name,
        "reviewedAt": r.reviewed_at.isoformat() + "Z" if r.reviewed_at else None,
        "remarks": r.remarks
    }


def _require_operator_or_admin_role(current_user: Optional[User]):
    """Enforces that if an authenticated user is present with role 'student', privileged write actions are blocked."""
    if current_user and current_user.role not in ("admin", "operator", "driver", "staff"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role}' is not authorized for attendance administration"
        )


# ==============================================================================
# 1. ATTENDANCE SESSIONS (dce_attendance_db)
# ==============================================================================

@router.post("/attendance/sessions")
def create_attendance_session(
    payload: AttendanceSessionCreateRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Creates a new active attendance session for Bus Boarding or Classroom verification."""
    _require_operator_or_admin_role(current_user)

    sess_type = (payload.sessionType or "BUS_BOARDING").upper()
    if sess_type not in ("BUS_BOARDING", "CLASSROOM", "EXAM_HALL"):
        raise HTTPException(status_code=400, detail="sessionType must be BUS_BOARDING, CLASSROOM, or EXAM_HALL")

    actor_id = current_user.id if current_user else "admin-01"
    actor_name = current_user.name if current_user else "DCE Transport Administrator"

    session_id = f"sess-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6]}"
    new_session = AttendanceSession(
        id=session_id,
        session_name=payload.sessionName.strip(),
        session_type=sess_type,
        status="OPEN",
        bus_id=payload.busId,
        route_id=payload.routeId,
        trip_id=payload.tripId,
        department=payload.department or "All Departments",
        subject_or_stop=payload.subjectOrStop or "",
        created_by_id=actor_id,
        created_by_name=actor_name,
        similarity_threshold=payload.similarityThreshold or settings.FACE_MATCH_SIMILARITY_THRESHOLD,
        require_liveness=True if payload.requireLiveness is None else payload.requireLiveness,
        started_at=datetime.utcnow(),
        total_verified=0,
        total_rejected=0
    )
    db.add(new_session)
    db.add(AuditLog(
        id=f"audit-sess-{uuid.uuid4().hex[:10]}",
        user_id=actor_id,
        user_name=actor_name,
        user_role=current_user.role if current_user else "admin",
        module="ATTENDANCE_BIOMETRIC",
        action="ATTENDANCE_SESSION_CREATED",
        target=f"AttendanceSession:{session_id}",
        details=f"Opened {sess_type} session '{new_session.session_name}' (threshold={new_session.similarity_threshold})"
    ))
    db.commit()
    db.refresh(new_session)

    return {
        "success": True,
        "session": _serialize_session(new_session)
    }


@router.get("/attendance/sessions")
def list_attendance_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    sessionType: Optional[str] = Query(None),
    busId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists active and historical attendance sessions."""
    query = db.query(AttendanceSession)
    if status_filter:
        query = query.filter(AttendanceSession.status == status_filter.upper())
    if sessionType:
        query = query.filter(AttendanceSession.session_type == sessionType.upper())
    if busId:
        query = query.filter(AttendanceSession.bus_id == busId)

    sessions = query.order_by(AttendanceSession.started_at.desc()).limit(100).all()
    return {
        "success": True,
        "sessions": [_serialize_session(s) for s in sessions],
        "count": len(sessions)
    }


@router.post("/attendance/sessions/{session_id}/close")
def close_attendance_session(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Closes an active attendance session."""
    _require_operator_or_admin_role(current_user)
    sess = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    sess.status = "CLOSED"
    sess.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(sess)
    return {"success": True, "session": _serialize_session(sess)}


# ==============================================================================
# 2. BIOMETRIC FACE ENROLLMENTS (dce_attendance_db + dce_student_db + dce_audit_db)
# ==============================================================================

@router.post("/attendance/enrollments")
def enroll_student_face(
    payload: FaceEnrollmentRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Enrolls a student's facial biometric template after verifying:
      1. Operator/admin authorization
      2. Explicit informed consent (consentGranted == True)
      3. Student existence and active status in dce_student_db
      4. Image magic-byte, lighting, sharpness, face presence, and liveness checks
    Stores ONLY the encrypted 128-D feature template in dce_attendance_db.
    """
    _require_operator_or_admin_role(current_user)

    if not payload.consentGranted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit student biometric consent (consentGranted=true) is mandatory before face enrollment"
        )

    student = db.query(Student).filter(Student.id == payload.studentId.strip()).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{payload.studentId}' not found in dce_student_db"
        )
    if not student.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Student '{student.id}' account is inactive and cannot be enrolled"
        )

    # Collect 1 or more base64 image samples (or generate deterministic camera test sample if none passed in dev simulator)
    raw_samples: List[bytes] = []
    try:
        if payload.sampleImagesBase64:
            for b64_item in payload.sampleImagesBase64:
                raw_samples.append(face_service.decode_base64_image(b64_item))
        elif payload.imageBase64:
            raw_samples.append(face_service.decode_base64_image(payload.imageBase64))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one face image (imageBase64 or sampleImagesBase64) is required for enrollment"
            )

        extracted_vectors = []
        quality_scores = []
        brightness_scores = []
        sharpness_scores = []

        for raw_img in raw_samples:
            analysis = face_service.analyze_image_and_extract_embedding(
                raw_img,
                liveness_hint=payload.livenessScore
            )
            extracted_vectors.append(analysis["embedding"])
            quality_scores.append(analysis["metrics"]["qualityScore"])
            brightness_scores.append(analysis["metrics"]["brightness"])
            sharpness_scores.append(analysis["metrics"]["sharpness"])

    except FaceQualityError as fqe:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": fqe.code,
                "message": fqe.message,
                "metrics": fqe.metrics
            }
        )

    # Average and unit-normalize across samples
    avg_vec = np.mean(np.asarray(extracted_vectors, dtype=np.float32), axis=0)
    norm = float(np.linalg.norm(avg_vec))
    avg_vec = (avg_vec / (norm if norm > 0 else 1.0)).tolist()

    encrypted_blob, tpl_hash = face_service.encrypt_template(avg_vec)

    actor_id = current_user.id if current_user else "admin-01"
    actor_name = current_user.name if current_user else "DCE Transport Administrator"

    existing = db.query(FaceEnrollment).filter(FaceEnrollment.student_id == student.id).first()
    if existing:
        existing.student_name = student.name
        existing.department = student.department
        existing.enrollment_status = "ACTIVE"
        existing.encrypted_template = encrypted_blob
        existing.template_version = "dce-face-128d-v1"
        existing.template_hash = tpl_hash
        existing.sample_count = len(raw_samples)
        existing.average_quality_score = round(float(np.mean(quality_scores)), 4)
        existing.brightness_score = round(float(np.mean(brightness_scores)), 2)
        existing.sharpness_score = round(float(np.mean(sharpness_scores)), 2)
        existing.consent_granted = True
        existing.consent_text = payload.consentText or existing.consent_text
        existing.consent_timestamp = datetime.utcnow()
        existing.enrolled_by_id = actor_id
        existing.enrolled_by_name = actor_name
        existing.revoked_at = None
        enrollment_obj = existing
    else:
        enrollment_obj = FaceEnrollment(
            id=f"fe-{student.id.lower()}-{uuid.uuid4().hex[:6]}",
            student_id=student.id,
            student_name=student.name,
            department=student.department,
            enrollment_status="ACTIVE",
            encrypted_template=encrypted_blob,
            template_version="dce-face-128d-v1",
            template_hash=tpl_hash,
            sample_count=len(raw_samples),
            average_quality_score=round(float(np.mean(quality_scores)), 4),
            brightness_score=round(float(np.mean(brightness_scores)), 2),
            sharpness_score=round(float(np.mean(sharpness_scores)), 2),
            consent_granted=True,
            consent_text=payload.consentText or "Explicit student biometric consent granted",
            consent_timestamp=datetime.utcnow(),
            enrolled_by_id=actor_id,
            enrolled_by_name=actor_name,
        )
        db.add(enrollment_obj)

    # Sync enrollment flag in dce_student_db
    student.face_enrolled = True

    # Record immutable audit trail in dce_audit_db
    db.add(AuditLog(
        id=f"audit-fe-{uuid.uuid4().hex[:10]}",
        user_id=actor_id,
        user_name=actor_name,
        user_role=current_user.role if current_user else "admin",
        module="ATTENDANCE_BIOMETRIC",
        action="BIOMETRIC_FACE_ENROLLED",
        target=f"Student:{student.id}",
        details=f"Enrolled encrypted 128-D face template for {student.name} ({student.id}) with {len(raw_samples)} sample(s)"
    ))

    db.commit()
    db.refresh(enrollment_obj)

    return {
        "success": True,
        "message": f"Face biometric template encrypted and enrolled for {student.name}",
        "enrollment": _serialize_enrollment(enrollment_obj)
    }


@router.get("/attendance/enrollments")
def list_face_enrollments(db: Session = Depends(get_db)):
    """Lists all face enrollment metadata records (never returns encrypted_template)."""
    enrollments = db.query(FaceEnrollment).order_by(FaceEnrollment.created_at.desc()).all()
    return {
        "success": True,
        "enrollments": [_serialize_enrollment(e) for e in enrollments],
        "count": len(enrollments)
    }


@router.get("/attendance/enrollments/{student_id}")
def get_student_face_enrollment(
    student_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Returns face enrollment status and quality metadata for a student without exposing raw templates."""
    if current_user and current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Students may only view their own enrollment status")

    enrollment = db.query(FaceEnrollment).filter(FaceEnrollment.student_id == student_id).first()
    if not enrollment or enrollment.enrollment_status != "ACTIVE":
        return {
            "success": True,
            "enrolled": False,
            "studentId": student_id,
            "enrollment": _serialize_enrollment(enrollment) if enrollment else None
        }

    return {
        "success": True,
        "enrolled": True,
        "studentId": student_id,
        "enrollment": _serialize_enrollment(enrollment)
    }


@router.delete("/attendance/enrollments/{student_id}")
def delete_student_face_enrollment(
    student_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Deletes/revokes a student's biometric face template in dce_attendance_db,
    updates dce_student_db, and logs an immutable deletion record in dce_audit_db.
    """
    _require_operator_or_admin_role(current_user)

    enrollment = db.query(FaceEnrollment).filter(FaceEnrollment.student_id == student_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail=f"No face enrollment found for student '{student_id}'")

    db.delete(enrollment)

    student = db.query(Student).filter(Student.id == student_id).first()
    if student:
        student.face_enrolled = False

    actor_id = current_user.id if current_user else "admin-01"
    actor_name = current_user.name if current_user else "DCE Transport Administrator"
    db.add(AuditLog(
        id=f"audit-fedel-{uuid.uuid4().hex[:10]}",
        user_id=actor_id,
        user_name=actor_name,
        user_role=current_user.role if current_user else "admin",
        module="ATTENDANCE_BIOMETRIC",
        action="BIOMETRIC_FACE_DELETED",
        target=f"Student:{student_id}",
        details=f"Permanently deleted encrypted biometric face template for student {student_id}"
    ))
    db.commit()

    return {
        "success": True,
        "studentId": student_id,
        "deleted": True,
        "message": f"Encrypted face template for {student_id} permanently deleted and audited"
    }


# ==============================================================================
# 3. LIVE FACE BIOMETRIC VERIFICATION (POST /api/attendance/verify)
# ==============================================================================

@router.post("/attendance/verify")
async def verify_face_attendance(
    payload: FaceVerificationRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Verifies a live face frame against an active AttendanceSession:
      - Checks session status (must be OPEN)
      - Validates image magic bytes, brightness, blur/sharpness, face presence, and liveness
      - Decrypts enrolled templates in memory and computes 128-D cosine similarity
      - Prevents duplicate attendance in the same session
      - Records FaceVerificationLog for both successes and rejections
      - Creates AttendanceRecord and broadcasts real-time SSE update on match
    """
    session_obj = db.query(AttendanceSession).filter(AttendanceSession.id == payload.sessionId).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail=f"Attendance session '{payload.sessionId}' not found")
    if session_obj.status != "OPEN":
        raise HTTPException(status_code=400, detail=f"Attendance session '{payload.sessionId}' is CLOSED")

    if not payload.imageBase64:
        raise HTTPException(status_code=400, detail="imageBase64 camera frame is required for face verification")

    # 1. Run image quality & liveness pipeline
    try:
        raw_bytes = face_service.decode_base64_image(payload.imageBase64)
        liveness_hint = payload.livenessScore if session_obj.require_liveness else 0.95
        analysis = face_service.analyze_image_and_extract_embedding(raw_bytes, liveness_hint=liveness_hint)
        probe_vec = analysis["embedding"]
        metrics = analysis["metrics"]
    except FaceQualityError as fqe:
        session_obj.total_rejected = (session_obj.total_rejected or 0) + 1
        db.add(FaceVerificationLog(
            id=f"fvl-{uuid.uuid4().hex[:12]}",
            session_id=session_obj.id,
            student_id=payload.studentId,
            outcome=fqe.code,
            similarity_score=0.0,
            threshold_used=session_obj.similarity_threshold,
            liveness_score=fqe.metrics.get("livenessScore"),
            brightness_score=fqe.metrics.get("brightness"),
            sharpness_score=fqe.metrics.get("sharpness"),
            bus_id=payload.busId or session_obj.bus_id,
            device_id=payload.deviceId,
            failure_reason=fqe.message
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "verified": False,
                "outcome": fqe.code,
                "message": fqe.message,
                "metrics": fqe.metrics
            }
        )

    # 2. Candidate lookup (1:1 if studentId provided, otherwise 1:N across active enrollments)
    if payload.studentId:
        candidate_enrollments = db.query(FaceEnrollment).filter(
            FaceEnrollment.student_id == payload.studentId.strip(),
            FaceEnrollment.enrollment_status == "ACTIVE"
        ).all()
        if not candidate_enrollments:
            session_obj.total_rejected = (session_obj.total_rejected or 0) + 1
            db.add(FaceVerificationLog(
                id=f"fvl-{uuid.uuid4().hex[:12]}",
                session_id=session_obj.id,
                student_id=payload.studentId,
                outcome="NOT_ENROLLED",
                similarity_score=0.0,
                threshold_used=session_obj.similarity_threshold,
                liveness_score=metrics["livenessScore"],
                brightness_score=metrics["brightness"],
                sharpness_score=metrics["sharpness"],
                bus_id=payload.busId or session_obj.bus_id,
                device_id=payload.deviceId,
                failure_reason=f"Student '{payload.studentId}' does not have an active face enrollment"
            ))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "verified": False,
                    "outcome": "NOT_ENROLLED",
                    "message": f"Student '{payload.studentId}' has no active biometric face enrollment"
                }
            )
    else:
        candidate_enrollments = db.query(FaceEnrollment).filter(
            FaceEnrollment.enrollment_status == "ACTIVE"
        ).all()
        if not candidate_enrollments:
            raise HTTPException(status_code=404, detail="No active face enrollments in database")

    # 3. Decrypt candidate templates in memory and find highest cosine similarity
    best_enrollment: Optional[FaceEnrollment] = None
    best_similarity: float = -1.0

    for cand in candidate_enrollments:
        try:
            enrolled_vec = face_service.decrypt_template(cand.encrypted_template)
            sim = face_service.compute_similarity(probe_vec, enrolled_vec)
            if sim > best_similarity:
                best_similarity = sim
                best_enrollment = cand
        except Exception:
            continue

    threshold = session_obj.similarity_threshold or settings.FACE_MATCH_SIMILARITY_THRESHOLD

    if not best_enrollment or best_similarity < threshold:
        session_obj.total_rejected = (session_obj.total_rejected or 0) + 1
        db.add(FaceVerificationLog(
            id=f"fvl-{uuid.uuid4().hex[:12]}",
            session_id=session_obj.id,
            student_id=payload.studentId or (best_enrollment.student_id if best_enrollment else None),
            outcome="LOW_CONFIDENCE",
            similarity_score=max(0.0, best_similarity),
            threshold_used=threshold,
            liveness_score=metrics["livenessScore"],
            brightness_score=metrics["brightness"],
            sharpness_score=metrics["sharpness"],
            bus_id=payload.busId or session_obj.bus_id,
            device_id=payload.deviceId,
            failure_reason=f"Face similarity {best_similarity:.4f} is below required threshold {threshold:.2f}"
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "verified": False,
                "outcome": "LOW_CONFIDENCE",
                "similarityScore": max(0.0, best_similarity),
                "threshold": threshold,
                "message": f"Face verification failed: similarity score ({best_similarity:.2f}) below threshold ({threshold:.2f})"
            }
        )

    matched_student_id = best_enrollment.student_id
    student = db.query(Student).filter(Student.id == matched_student_id).first()
    if not student or not student.is_active:
        raise HTTPException(status_code=403, detail=f"Matched student '{matched_student_id}' is inactive")

    # 4. Prevent duplicate attendance within the same session
    existing_in_session = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_obj.id,
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.verification_status.in_(["VERIFIED", "MANUAL_APPROVED"])
    ).first()

    if existing_in_session:
        db.add(FaceVerificationLog(
            id=f"fvl-{uuid.uuid4().hex[:12]}",
            session_id=session_obj.id,
            student_id=student.id,
            outcome="DUPLICATE_IN_SESSION",
            similarity_score=best_similarity,
            threshold_used=threshold,
            liveness_score=metrics["livenessScore"],
            brightness_score=metrics["brightness"],
            sharpness_score=metrics["sharpness"],
            bus_id=payload.busId or session_obj.bus_id,
            device_id=payload.deviceId,
            failure_reason="Student already verified in this attendance session"
        ))
        db.commit()
        return {
            "success": True,
            "verified": True,
            "duplicate": True,
            "outcome": "DUPLICATE_IN_SESSION",
            "similarityScore": best_similarity,
            "threshold": threshold,
            "message": f"{student.name} ({student.id}) is already marked present in this session",
            "attendance": _serialize_attendance(existing_in_session)
        }

    # 5. Resolve Bus & Route context
    eff_bus_id = payload.busId or session_obj.bus_id or "bus-07"
    bus = db.query(Bus).filter((Bus.id == eff_bus_id) | (Bus.bus_number == eff_bus_id.upper())).first()
    bus_id_val = bus.id if bus else eff_bus_id
    bus_num_val = bus.bus_number if bus else "DCE-CLASSROOM"
    route_id_val = payload.routeId or session_obj.route_id or (bus.route_id if bus else "route-07") or "route-07"

    try:
        permitted_buses = json.loads(student.permitted_bus_ids) if student.permitted_bus_ids else []
    except Exception:
        permitted_buses = []

    if session_obj.session_type == "CLASSROOM":
        is_authorized = True
        event_type = "CLASSROOM_PRESENT"
        stop_name = session_obj.subject_or_stop or "Classroom Session"
    else:
        is_authorized = (bus_id_val in permitted_buses) or (bus_num_val in permitted_buses) or not permitted_buses
        event_type = (payload.eventType or "BOARDING").upper()
        stop_name = payload.stopName or student.designated_stop_name or "On Route"

    record = AttendanceRecord(
        id=f"att-face-{student.id.lower()}-{int(time.time())}-{uuid.uuid4().hex[:4]}",
        session_id=session_obj.id,
        student_id=student.id,
        student_name=student.name,
        department=student.department,
        bus_id=bus_id_val,
        bus_number=bus_num_val,
        route_id=route_id_val,
        stop_id=payload.stopId or student.designated_stop_id,
        stop_name=stop_name,
        event_type=event_type,
        verification_method="FACE_BIOMETRIC",
        confidence_score=best_similarity,
        liveness_passed=True,
        liveness_score=metrics["livenessScore"],
        verification_status="VERIFIED",
        latitude=payload.latitude,
        longitude=payload.longitude,
        device_id=payload.deviceId or "face-term-01",
        timestamp=datetime.utcnow(),
        sync_status="REALTIME",
        is_authorized=is_authorized,
        remarks=f"Verified via Face Biometric + Liveness ({best_similarity * 100:.1f}% match)"
    )
    db.add(record)

    session_obj.total_verified = (session_obj.total_verified or 0) + 1

    if bus and event_type == "BOARDING":
        bus.current_occupancy = min(bus.capacity or 50, (bus.current_occupancy or 0) + 1)
    elif bus and event_type == "EXIT":
        bus.current_occupancy = max(0, (bus.current_occupancy or 0) - 1)

    db.add(FaceVerificationLog(
        id=f"fvl-{uuid.uuid4().hex[:12]}",
        session_id=session_obj.id,
        student_id=student.id,
        outcome="MATCH_VERIFIED",
        similarity_score=best_similarity,
        threshold_used=threshold,
        liveness_score=metrics["livenessScore"],
        brightness_score=metrics["brightness"],
        sharpness_score=metrics["sharpness"],
        bus_id=bus_id_val,
        device_id=payload.deviceId,
        failure_reason=None
    ))

    db.commit()
    db.refresh(record)

    serialized = _serialize_attendance(record)
    await sse_manager.broadcast({
        "type": "ATTENDANCE_UPDATE",
        "attendance": serialized,
        "timestamp": int(time.time() * 1000)
    })

    return {
        "success": True,
        "verified": True,
        "duplicate": False,
        "outcome": "MATCH_VERIFIED",
        "similarityScore": best_similarity,
        "threshold": threshold,
        "metrics": metrics,
        "attendance": serialized
    }


# ==============================================================================
# 4. ATTENDANCE RECORDS & MANUAL REVIEW (GET /records, GET /records/{student_id}, POST /review)
# ==============================================================================

@router.get("/attendance/records")
def list_attendance_records(
    sessionId: Optional[str] = Query(None),
    busId: Optional[str] = Query(None),
    studentId: Optional[str] = Query(None),
    verificationMethod: Optional[str] = Query(None),
    verificationStatus: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Lists attendance records with optional session, bus, student, method, and status filters."""
    query = db.query(AttendanceRecord)
    if sessionId:
        query = query.filter(AttendanceRecord.session_id == sessionId)
    if busId:
        query = query.filter((AttendanceRecord.bus_id == busId) | (AttendanceRecord.bus_number == busId.upper()))
    if studentId:
        query = query.filter(AttendanceRecord.student_id == studentId)
    if verificationMethod:
        query = query.filter(AttendanceRecord.verification_method == verificationMethod.upper())
    if verificationStatus:
        query = query.filter(AttendanceRecord.verification_status == verificationStatus.upper())

    records = query.order_by(AttendanceRecord.timestamp.desc()).limit(limit).all()
    return {
        "success": True,
        "records": [_serialize_attendance(r) for r in records],
        "count": len(records)
    }


@router.get("/attendance/records/{student_id}")
def get_student_attendance_records(
    student_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Returns attendance records and biometric enrollment summary for a specific student."""
    if current_user and current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are only permitted to view their own attendance records"
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id
    ).order_by(AttendanceRecord.timestamp.desc()).limit(200).all()

    enrollment = db.query(FaceEnrollment).filter(
        FaceEnrollment.student_id == student_id,
        FaceEnrollment.enrollment_status == "ACTIVE"
    ).first()

    return {
        "success": True,
        "studentId": student_id,
        "student": _serialize_student(student) if student else None,
        "faceEnrolled": enrollment is not None,
        "records": [_serialize_attendance(r) for r in records],
        "count": len(records)
    }


@router.post("/attendance/records/{record_id}/review")
def review_attendance_record(
    record_id: str,
    payload: AttendanceReviewRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Allows an operator or administrator to manually review, approve, or reject
    a flagged or fallback attendance record with an immutable audit trail in dce_audit_db.
    """
    _require_operator_or_admin_role(current_user)

    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    decision = payload.decision.strip().upper()
    if decision not in ("MANUAL_APPROVED", "MANUAL_REJECTED", "FLAGGED_FOR_REVIEW", "VERIFIED"):
        raise HTTPException(
            status_code=400,
            detail="decision must be MANUAL_APPROVED, MANUAL_REJECTED, FLAGGED_FOR_REVIEW, or VERIFIED"
        )

    actor_id = current_user.id if current_user else "admin-01"
    actor_name = current_user.name if current_user else "DCE Transport Administrator"

    record.verification_status = decision
    if payload.eventType:
        record.event_type = payload.eventType.upper()
    if payload.stopName:
        record.stop_name = payload.stopName
    if payload.isAuthorized is not None:
        record.is_authorized = payload.isAuthorized
    elif decision == "MANUAL_REJECTED":
        record.is_authorized = False
    elif decision == "MANUAL_APPROVED":
        record.is_authorized = True

    record.reviewed_by_id = actor_id
    record.reviewed_by_name = actor_name
    record.reviewed_at = datetime.utcnow()
    record.remarks = payload.remarks
    record.sync_status = "MANUAL_CORRECTED"

    db.add(AuditLog(
        id=f"audit-rev-{uuid.uuid4().hex[:10]}",
        user_id=actor_id,
        user_name=actor_name,
        user_role=current_user.role if current_user else "admin",
        module="ATTENDANCE_BIOMETRIC",
        action="ATTENDANCE_MANUAL_REVIEW",
        target=f"AttendanceRecord:{record.id}",
        details=f"Reviewed record {record.id} for student {record.student_id} -> {decision}: {payload.remarks}"
    ))
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "message": f"Attendance record reviewed ({decision}) and logged in dce_audit_db",
        "attendance": _serialize_attendance(record)
    }


# ==============================================================================
# 5. RFID / QR HARDWARE TAP & 4G BATCH SYNC (PRESERVED & INTEGRATED)
# ==============================================================================

def _process_single_tap(
    db: Session,
    tap: AttendanceTapRequest,
    default_sync_status: str = "REALTIME"
) -> tuple[AttendanceRecord, bool, str]:
    """
    Processes a single RFID/QR tap with deterministic event ID deduplication
    and a 5-minute anti-passback cooldown window.
    """
    if tap.eventId:
        existing_by_id = db.query(AttendanceRecord).filter(AttendanceRecord.id == tap.eventId).first()
        if existing_by_id:
            return existing_by_id, True, "Event ID already synchronized (idempotent skip)"

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

    try:
        permitted_buses = json.loads(student.permitted_bus_ids) if student.permitted_bus_ids else []
    except Exception:
        permitted_buses = []

    is_authorized = (bus.id in permitted_buses) or (bus.bus_number in permitted_buses)
    remarks = "Verified on permitted bus" if is_authorized else f"WARNING: Student permitted on {permitted_buses}, boarded {bus.bus_number}"

    stop_name = tap.stopName
    if not stop_name and tap.stopId:
        st = db.query(Stop).filter(Stop.id == tap.stopId).first()
        if st:
            stop_name = st.name
    if not stop_name:
        stop_name = student.designated_stop_name or "On Route"

    ver_method = "QR_CODE" if ident.upper().startswith("QR-") else "RFID_CARD"
    record_id = tap.eventId or f"att-{bus.id}-{student.id.lower()}-{int(event_time.timestamp())}-{uuid.uuid4().hex[:4]}"
    record = AttendanceRecord(
        id=record_id,
        session_id=tap.sessionId,
        student_id=student.id,
        student_name=student.name,
        department=student.department,
        bus_id=bus.id,
        bus_number=bus.bus_number,
        route_id=tap.routeId or bus.route_id or "route-07",
        stop_id=tap.stopId or student.designated_stop_id,
        stop_name=stop_name,
        event_type=event_type,
        verification_method=ver_method,
        confidence_score=1.0,
        liveness_passed=True,
        liveness_score=1.0,
        verification_status="VERIFIED",
        device_id=tap.deviceId or f"pi-{bus.id}",
        timestamp=event_time,
        sync_status=tap.syncStatus or default_sync_status,
        is_authorized=is_authorized,
        remarks=remarks,
        created_at=datetime.utcnow()
    )
    db.add(record)

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
    """Lists registered students from dce_student_db and their RFID/QR/Face status."""
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
    """Registers or updates a student profile in dce_student_db."""
    existing = db.query(Student).filter(Student.id == payload.id).first()
    if existing:
        existing.name = payload.name
        existing.roll_number = payload.rollNumber or existing.roll_number
        existing.email = payload.email or existing.email
        existing.department = payload.department or existing.department
        existing.year_of_study = payload.yearOfStudy or existing.year_of_study
        existing.batch = payload.batch or existing.batch
        existing.section = payload.section or existing.section
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
        roll_number=payload.rollNumber or payload.id,
        name=payload.name,
        email=payload.email or f"{payload.id.lower()}@dce.edu.in",
        department=payload.department or "Computer Science & Engineering",
        year_of_study=payload.yearOfStudy or 3,
        batch=payload.batch or "2022-2026",
        section=payload.section or "A",
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
    all_records = db.query(AttendanceRecord).all()
    total_students = db.query(Student).filter(Student.is_active == True).count()
    face_enrolled_count = db.query(FaceEnrollment).filter(FaceEnrollment.enrollment_status == "ACTIVE").count()
    active_sessions_count = db.query(AttendanceSession).filter(AttendanceSession.status == "OPEN").count()

    boardings = [r for r in all_records if r.event_type == "BOARDING"]
    exits = [r for r in all_records if r.event_type == "EXIT"]
    face_verified = [r for r in all_records if r.verification_method == "FACE_BIOMETRIC"]
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
            "faceEnrolledStudents": face_enrolled_count,
            "activeAttendanceSessions": active_sessions_count,
            "totalEvents": len(all_records),
            "totalBoardings": len(boardings),
            "totalExits": len(exits),
            "faceBiometricVerified": len(face_verified),
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
    _require_operator_or_admin_role(current_user)
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
        user_role=current_user.role if current_user else "admin",
        module="ATTENDANCE_BIOMETRIC",
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
