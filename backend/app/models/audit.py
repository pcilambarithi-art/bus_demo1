from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from ..database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), nullable=True)
    user_name = Column(String(128), default="System")
    action = Column(String(64), nullable=False, index=True)
    target = Column(String(128), default="")
    details = Column(Text, default="")
    ip_address = Column(String(64), default="")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
