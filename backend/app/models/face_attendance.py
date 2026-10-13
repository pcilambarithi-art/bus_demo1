from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, Index
from ..database import AttendanceBase


class FaceEnrollment(AttendanceBase):
    """
    Stored in dce_attendance_db (`face_enrollments` table).
    Stores encrypted 128-D face biometric templates at rest alongside explicit informed consent.
    Raw face images are never persisted in public folders, and encrypted_template is never returned in API responses.
    """
    __tablename__ = "face_enrollments"

    id = Column(String(64), primary_key=True, index=True)
    student_id = Column(String(64), unique=True, index=True, nullable=False)  # Logical ref to dce_student_db.students.id
    student_name = Column(String(128), nullable=False)
    department = Column(String(64), default="")
    enrollment_status = Column(String(32), default="ACTIVE", index=True)  # ACTIVE | REVOKED | PENDING_REENROLL
    encrypted_template = Column(Text, nullable=False)  # Encrypted 128-D vector + HMAC tag
    template_version = Column(String(32), default="dce-face-128d-v1")
    template_hash = Column(String(128), nullable=False)
    sample_count = Column(Integer, default=1)
    average_quality_score = Column(Float, default=0.90)
    brightness_score = Column(Float, default=120.0)
    sharpness_score = Column(Float, default=35.0)
    consent_granted = Column(Boolean, default=True, nullable=False)
    consent_text = Column(Text, default="")
    consent_timestamp = Column(DateTime, default=datetime.utcnow)
    enrolled_by_id = Column(String(64), nullable=False)
    enrolled_by_name = Column(String(128), default="Administrator")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)


class AttendanceSession(AttendanceBase):
    """
    Stored in dce_attendance_db (`attendance_sessions` table).
    Represents an active or closed attendance window for bus boarding or classroom verification.
    """
    __tablename__ = "attendance_sessions"

    id = Column(String(64), primary_key=True, index=True)
    session_name = Column(String(128), nullable=False)
    session_type = Column(String(32), default="BUS_BOARDING", index=True)  # BUS_BOARDING | CLASSROOM | EXAM_HALL
    status = Column(String(32), default="OPEN", index=True)  # OPEN | CLOSED
    bus_id = Column(String(64), index=True, nullable=True)
    route_id = Column(String(64), index=True, nullable=True)
    trip_id = Column(String(64), nullable=True)
    department = Column(String(64), nullable=True)
    subject_or_stop = Column(String(128), nullable=True)
    created_by_id = Column(String(64), nullable=False)
    created_by_name = Column(String(128), default="Administrator")
    similarity_threshold = Column(Float, default=0.82)
    require_liveness = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)
    total_verified = Column(Integer, default=0)
    total_rejected = Column(Integer, default=0)


class FaceVerificationLog(AttendanceBase):
    """
    Stored in dce_attendance_db (`face_verification_logs` table).
    Records every face verification attempt outcome, quality scores, liveness score, and failure reason.
    """
    __tablename__ = "face_verification_logs"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    student_id = Column(String(64), index=True, nullable=True)
    outcome = Column(String(64), index=True, nullable=False)
    similarity_score = Column(Float, nullable=True)
    threshold_used = Column(Float, default=0.82)
    liveness_score = Column(Float, nullable=True)
    brightness_score = Column(Float, nullable=True)
    sharpness_score = Column(Float, nullable=True)
    bus_id = Column(String(64), nullable=True)
    device_id = Column(String(64), nullable=True)
    failure_reason = Column(String(256), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_fvl_session_student", "session_id", "student_id"),
    )
