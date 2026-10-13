from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, Index
from ..database import StudentBase, AttendanceBase


class Student(StudentBase):
    """Stored in dce_student_db (`students` table)."""
    __tablename__ = "students"

    id = Column(String(64), primary_key=True, index=True)  # e.g. "DCE-2024-CS042"
    user_id = Column(String(64), index=True, nullable=True)  # Logical ref to dce_identity_db.users.id
    roll_number = Column(String(64), unique=True, index=True, nullable=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), index=True, nullable=True)
    department = Column(String(64), default="Computer Science & Engineering", index=True)
    year_of_study = Column(Integer, default=3)
    batch = Column(String(32), default="2022-2026")
    section = Column(String(16), default="A")
    rfid_uid = Column(String(64), unique=True, index=True, nullable=True)  # Card UID hex
    qr_token = Column(String(128), unique=True, index=True, nullable=True)  # QR unique hash
    permitted_bus_ids = Column(Text, default="[\"bus-07\"]")  # JSON list of authorized buses
    permitted_route_ids = Column(Text, default="[\"route-07\"]")
    designated_stop_id = Column(String(64), nullable=True)
    designated_stop_name = Column(String(128), default="Tambaram West Stand")
    face_enrolled = Column(Boolean, default=False)
    parent_phone = Column(String(32), default="+91 94440 00000")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AttendanceRecord(AttendanceBase):
    """Stored in dce_attendance_db (`attendance_records` table)."""
    __tablename__ = "attendance_records"

    id = Column(String(64), primary_key=True, index=True)  # e.g. "att-bus07-cs042-17915199"
    session_id = Column(String(64), index=True, nullable=True)  # Ref to attendance_sessions.id
    student_id = Column(String(64), index=True, nullable=False)  # Logical ref to dce_student_db.students.id
    student_name = Column(String(128), nullable=False)
    department = Column(String(64), default="")
    bus_id = Column(String(64), index=True, nullable=False)
    bus_number = Column(String(32), index=True, nullable=False)
    route_id = Column(String(64), index=True, nullable=False)
    stop_id = Column(String(64), nullable=True)
    stop_name = Column(String(128), default="On Route")
    event_type = Column(String(32), default="BOARDING")  # BOARDING | EXIT | CLASSROOM_PRESENT
    verification_method = Column(String(32), default="RFID_CARD")  # FACE_BIOMETRIC | RFID_CARD | QR_CODE | MANUAL_OVERRIDE
    confidence_score = Column(Float, nullable=True)
    liveness_passed = Column(Boolean, default=True)
    liveness_score = Column(Float, nullable=True)
    verification_status = Column(String(32), default="VERIFIED")  # VERIFIED | REJECTED | FLAGGED_FOR_REVIEW | MANUAL_APPROVED | MANUAL_REJECTED
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_id = Column(String(64), default="pi-bus-07")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sync_status = Column(String(32), default="REALTIME")  # REALTIME | OFFLINE_SYNCED | MANUAL_CORRECTED
    is_authorized = Column(Boolean, default=True)
    reviewed_by_id = Column(String(64), nullable=True)
    reviewed_by_name = Column(String(128), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    remarks = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_att_student_time", "student_id", "timestamp"),
        Index("idx_att_bus_date", "bus_id", "timestamp"),
        Index("idx_att_session_student", "session_id", "student_id"),
    )
