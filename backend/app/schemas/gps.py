from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class GPSIngestRequest(BaseModel):
    busId: Optional[str] = None
    busNumber: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed: Optional[float] = Field(default=0.0, ge=0.0, le=200.0)
    heading: Optional[float] = Field(default=0.0, ge=0.0, le=360.0)
    accuracy: Optional[float] = Field(default=5.0, ge=0.0)
    timestamp: Optional[int] = None # epoch ms
    eventId: Optional[str] = None
    isSimulated: Optional[bool] = False

class GPSStaffUpdateRequest(BaseModel):
    busId: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None
    isSimulated: Optional[bool] = False

class LiveBusTelemetryResponse(BaseModel):
    busId: str
    busNumber: str
    plateNumber: str
    routeId: Optional[str] = None
    driverName: Optional[str] = None
    lat: float
    lng: float
    speedKmh: float
    heading: float
    accuracy: float
    lastUpdated: int
    status: str
    statusIndicator: str # green | red | yellow | grey
    statusLabel: str
    currentStation: Optional[Dict[str, Any]] = None
    nextStation: Optional[Dict[str, Any]] = None
    distanceToNextStationMeters: int = 0
    etaToNextStationMinutes: int = 0
    secondsSinceUpdate: int = 0
    gpsHealth: str # active | weak | offline
    gpsHealthLabel: str
    isSimulated: bool = False
