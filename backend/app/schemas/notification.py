from typing import Optional
from pydantic import BaseModel

class AnnouncementCreate(BaseModel):
    id: Optional[str] = None
    routeId: Optional[str] = "route-07"
    stopId: Optional[str] = "stop-07-3"
    stopName: Optional[str] = "Tambaram West Stand"
    text: Optional[str] = None
    message: Optional[str] = None # Support both
    textTamil: Optional[str] = ""
    language: Optional[str] = "en-IN"
    audioUrl: Optional[str] = ""
    triggerDistanceMeters: Optional[int] = 300
    isActive: Optional[bool] = True

class AnnouncementUpdate(BaseModel):
    routeId: Optional[str] = None
    stopId: Optional[str] = None
    stopName: Optional[str] = None
    text: Optional[str] = None
    textTamil: Optional[str] = None
    language: Optional[str] = None
    audioUrl: Optional[str] = None
    triggerDistanceMeters: Optional[int] = None
    isActive: Optional[bool] = None

class IssueReportCreate(BaseModel):
    busId: Optional[str] = "bus-07"
    busNumber: Optional[str] = "DCE-BUS-07"
    routeId: Optional[str] = "route-07"
    issueType: Optional[str] = "Mechanical Problem"
    description: str
    location: Optional[str] = "On Route"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    priority: Optional[str] = "Medium"
    photoUrl: Optional[str] = ""

class IssueReportUpdate(BaseModel):
    status: Optional[str] = None
    adminRemarks: Optional[str] = None
    priority: Optional[str] = None
