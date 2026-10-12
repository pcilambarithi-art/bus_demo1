from typing import Optional
from pydantic import BaseModel

class BusCreate(BaseModel):
    id: Optional[str] = None
    busNumber: str
    plateNumber: Optional[str] = None
    routeId: Optional[str] = "route-07"
    routeName: Optional[str] = "DCE Express"
    startingPoint: Optional[str] = "Tambaram"
    destination: Optional[str] = "DCE Campus"
    assignedStaffId: Optional[str] = "staff-01"
    driverName: Optional[str] = "DCE Bus Driver"
    driverPhone: Optional[str] = "+91 94440 00000"
    driverRating: Optional[float] = 4.8
    busImage: Optional[str] = None
    capacity: Optional[int] = 50
    currentOccupancy: Optional[int] = 0
    hasAC: Optional[bool] = False
    isLive: Optional[bool] = True
    statusText: Optional[str] = "In Service (Active)"
    operationalStatus: Optional[str] = "In Service"
    currentLat: Optional[float] = 12.9249
    currentLng: Optional[float] = 80.1165
    currentSpeed: Optional[float] = 0.0

class BusUpdate(BaseModel):
    busNumber: Optional[str] = None
    plateNumber: Optional[str] = None
    routeId: Optional[str] = None
    routeName: Optional[str] = None
    startingPoint: Optional[str] = None
    destination: Optional[str] = None
    assignedStaffId: Optional[str] = None
    driverName: Optional[str] = None
    driverPhone: Optional[str] = None
    driverRating: Optional[float] = None
    busImage: Optional[str] = None
    capacity: Optional[int] = None
    currentOccupancy: Optional[int] = None
    hasAC: Optional[bool] = None
    isLive: Optional[bool] = None
    isActive: Optional[bool] = None
    statusText: Optional[str] = None
    operationalStatus: Optional[str] = None
    currentLat: Optional[float] = None
    currentLng: Optional[float] = None
    currentSpeed: Optional[float] = None

class BusStatusUpdateRequest(BaseModel):
    busId: Optional[str] = None
    busNumber: Optional[str] = None
    status: Optional[str] = "On Route"
    statusText: Optional[str] = None
