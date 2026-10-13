from typing import Optional, List
from pydantic import BaseModel, Field

class DeviceHeartbeatRequest(BaseModel):
    deviceId: str
    busId: str
    firmwareVersion: Optional[str] = "1.2.0"
    modemModel: Optional[str] = "Huawei E3372h 4G LTE"
    ipAddress: Optional[str] = "100.64.0.1"
    signalCsq: Optional[int] = Field(24, ge=0, le=31)
    gpsFixStatus: Optional[str] = "3D_FIX" # NO_FIX | 2D_FIX | 3D_FIX
    batteryVoltage: Optional[float] = 13.8
    cpuTempC: Optional[float] = 42.0
    pendingGpsCount: Optional[int] = 0
    pendingAttendanceCount: Optional[int] = 0

class DeviceGPSItem(BaseModel):
    eventId: str = Field(..., description="Unique event ID generated on Raspberry Pi")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    accuracy: Optional[float] = 4.5
    timestamp: int = Field(..., description="Device epoch timestamp in milliseconds")

class DeviceGPSBatchSyncRequest(BaseModel):
    deviceId: str
    busId: str
    points: List[DeviceGPSItem]
