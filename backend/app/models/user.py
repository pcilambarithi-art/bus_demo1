from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    phone = Column(String(32), index=True, default="")
    role = Column(String(32), nullable=False, default="student") # admin | driver | staff | student
    password_hash = Column(String(256), nullable=False)
    assigned_bus_id = Column(String(64), nullable=True, index=True)
    assigned_route_id = Column(String(64), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
