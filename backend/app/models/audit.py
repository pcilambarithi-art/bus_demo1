from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from ..database import AuditBase


class AuditLog(AuditBase):
    """Stored in dce_audit_db (`audit_logs` table)."""
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), nullable=True, index=True)
    user_name = Column(String(128), default="System")
    user_role = Column(String(32), default="admin")
    module = Column(String(64), default="SYSTEM", index=True)  # IDENTITY | ATTENDANCE_BIOMETRIC | BUS_TRACKING | ADMIN
    action = Column(String(64), nullable=False, index=True)
    target = Column(String(128), default="")
    details = Column(Text, default="")
    ip_address = Column(String(64), default="")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
