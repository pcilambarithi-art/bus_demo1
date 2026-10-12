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

require_admin = require_roles(["admin"])
require_driver_or_admin = require_roles(["driver", "staff", "admin"])
