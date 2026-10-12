from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: Optional[str] = None
    emailOrPhone: Optional[str] = None
    password: str

class TokenResponse(BaseModel):
    success: bool
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = ""
    role: str
    assignedBusId: Optional[str] = None
    assignedRouteId: Optional[str] = None
    status: Optional[str] = "active"

class StaffCreateRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    role: Optional[str] = "driver"
    assignedBusId: Optional[str] = "bus-07"
    assignedRouteId: Optional[str] = "route-07"
    password: Optional[str] = "dce2024"

class StaffUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    assignedBusId: Optional[str] = None
    assignedRouteId: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None
