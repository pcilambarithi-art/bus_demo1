from typing import Optional, List
from pydantic import BaseModel, Field

class StudentCreateRequest(BaseModel):
    id: str = Field(..., description="Unique Student Roll Number e.g. DCE-2024-CS042")
    name: str
    department: Optional[str] = "Computer Science & Engineering"
    batch: Optional[str] = "2022-2026"
    rfidUid: Optional[str] = None
    qrToken: Optional[str] = None
    permittedBusIds: List[str] = ["bus-07"]
    permittedRouteIds: List[str] = ["route-07"]
    designatedStopId: Optional[str] = None
    designatedStopName: Optional[str] = "Tambaram West Stand"
    parentPhone: Optional[str] = ""

class AttendanceTapRequest(BaseModel):
    eventId: Optional[str] = Field(None, description="Deterministic event ID from Pi agent for idempotency")
    studentIdentifier: str = Field(..., description="RFID UID, QR Token, or Student Roll ID")
    busId: str
    routeId: Optional[str] = None
    stopId: Optional[str] = None
    stopName: Optional[str] = None
    eventType: Optional[str] = "BOARDING" # BOARDING | EXIT
    deviceId: Optional[str] = "pi-bus-07"
    timestamp: Optional[int] = None # Epoch milliseconds captured on device
    syncStatus: Optional[str] = "REALTIME" # REALTIME | OFFLINE_SYNCED

class AttendanceBatchSyncRequest(BaseModel):
    deviceId: str
    busId: str
    records: List[AttendanceTapRequest]

class AttendanceCorrectionRequest(BaseModel):
    eventType: Optional[str] = None
    stopName: Optional[str] = None
    isAuthorized: Optional[bool] = None
    remarks: str = Field(..., description="Reason for administrative attendance modification")
