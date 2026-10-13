from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Index, ForeignKey
from ..database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(String(64), primary_key=True, index=True) # e.g. "DCE-2024-CS042"
    name = Column(String(128), nullable=False)
    department = Column(String(64), default="Computer Science & Engineering")
    batch = Column(String(32), default="2022-2026")
    rfid_uid = Column(String(64), unique=True, index=True, nullable=True) # Card UID hex
    qr_token = Column(String(128), unique=True, index=True, nullable=True) # QR unique hash
    permitted_bus_ids = Column(Text, default="[\"bus-07\"]") # JSON list of authorized buses
    permitted_route_ids = Column(Text, default="[\"route-07\"]")
    designated_stop_id = Column(String(64), nullable=True)
    designated_stop_name = Column(String(128), default="Tambaram West Stand")
    parent_phone = Column(String(32), default="+91 94440 00000")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(64), primary_key=True, index=True) # e.g. "att-bus07-cs042-17915199"
    student_id = Column(String(64), index=True, nullable=False)
    student_name = Column(String(128), nullable=False)
    department = Column(String(64), default="")
    bus_id = Column(String(64), index=True, nullable=False)
    bus_number = Column(String(32), index=True, nullable=False)
    route_id = Column(String(64), index=True, nullable=False)
    stop_id = Column(String(64), nullable=True)
    stop_name = Column(String(128), default="On Route")
    event_type = Column(String(32), default="BOARDING") # BOARDING | EXIT
    device_id = Column(String(64), default="pi-bus-07")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sync_status = Column(String(32), default="REALTIME") # REALTIME | OFFLINE_SYNCED | MANUAL_CORRECTED
    is_authorized = Column(Boolean, default=True)
    remarks = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_att_student_time", "student_id", "timestamp"),
        Index("idx_att_bus_date", "bus_id", "timestamp"),
    )
