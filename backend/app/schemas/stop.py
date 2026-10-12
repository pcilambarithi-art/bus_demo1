from typing import Optional
from pydantic import BaseModel

class StopCreate(BaseModel):
    id: Optional[str] = None
    routeId: Optional[str] = None
    name: str
    shortName: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    latitude: Optional[float] = None # Support both formats
    longitude: Optional[float] = None
    sequence: Optional[int] = None
    scheduledTime: Optional[str] = "07:30 AM"
    studentsWaiting: Optional[int] = 0
    isTerminal: Optional[bool] = False
    geofenceRadius: Optional[int] = 60
    dwellSeconds: Optional[int] = 60

class StopUpdate(BaseModel):
    name: Optional[str] = None
    shortName: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    sequence: Optional[int] = None
    scheduledTime: Optional[str] = None
    studentsWaiting: Optional[int] = None
    isTerminal: Optional[bool] = None
    geofenceRadius: Optional[int] = None
    dwellSeconds: Optional[int] = None
    isActive: Optional[bool] = None
