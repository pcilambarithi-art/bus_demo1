from typing import List, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from .authentication import decode_access_token

def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub") or payload.get("id")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token"
        )
    user_id = payload.get("sub") or payload.get("id")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or disabled"
        )
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

from datetime import datetime
from ..models.device import Device
from .authentication import verify_password

require_admin = require_roles(["admin"])
require_driver_or_admin = require_roles(["driver", "staff", "admin"])

def verify_device_credentials(
    db: Session,
    device_id: Optional[str],
    device_key: Optional[str],
    target_bus_id: Optional[str] = None,
    require_strict: bool = False
) -> Optional[Device]:
    """
    Validates Raspberry Pi 5 bus agent credentials (X-Device-Id & X-Device-Key)
    and enforces strict device-to-bus assignment so a compromised or misconfigured
    device cannot spoof telemetry or attendance for another bus.
    """
    if not device_id and not device_key:
        if require_strict:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-Device-Id or X-Device-Key authentication headers"
            )
        return None

    if not device_id or not device_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Both X-Device-Id and X-Device-Key headers must be provided"
        )

    device = db.query(Device).filter(Device.id == device_id, Device.is_active == True).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unregistered or inactive bus agent device: {device_id}"
        )

    if not verify_password(device_key, device.api_key_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-Device-Key secret for this bus agent"
        )

    if target_bus_id and device.bus_id != target_bus_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Device '{device_id}' is bound to '{device.bus_id}' and is not authorized to update '{target_bus_id}'"
        )

    device.last_heartbeat = datetime.utcnow()
    device.is_online = True
    return device

