from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from ..database import IdentityBase


class User(IdentityBase):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    phone = Column(String(32), index=True, default="")
    role = Column(String(32), nullable=False, default="student")  # admin | driver | operator | staff | student
    password_hash = Column(String(256), nullable=False)
    assigned_bus_id = Column(String(64), nullable=True, index=True)
    assigned_route_id = Column(String(64), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RevokedToken(IdentityBase):
    __tablename__ = "revoked_tokens"

    token_hash = Column(String(128), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    revoked_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)
    reason = Column(String(128), default="User logout")


class AuthLoginEvent(IdentityBase):
    __tablename__ = "auth_login_events"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=True)
    identifier = Column(String(128), index=True, nullable=False)
    role = Column(String(32), default="student")
    success = Column(Boolean, default=False, index=True)
    ip_address = Column(String(64), default="")
    failure_reason = Column(String(128), default="")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
