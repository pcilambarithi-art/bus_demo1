from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SystemHealth(BaseModel):
    status: str = "ONLINE"
    activeBuses: int = 5
    activeStaff: int = 4
    lastSyncedAt: str
    sourceOfTruth: str = "DCE Central Transit Cloud Server v2.5 (FastAPI SQLite Live Engine)"

class SyncPayloadResponse(BaseModel):
    success: bool = True
    buses: List[Dict[str, Any]]
    routes: List[Dict[str, Any]]
    stops: List[Dict[str, Any]]
    liveTelemetry: Optional[List[Dict[str, Any]]] = None
    notificationHistory: Optional[List[Dict[str, Any]]] = None
    announcements: List[Dict[str, Any]]
    activeIssues: List[Dict[str, Any]]
    systemHealth: SystemHealth
