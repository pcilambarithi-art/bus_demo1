from typing import Optional, List
from pydantic import BaseModel, Field


class StudentCreateRequest(BaseModel):
    id: str = Field(..., description="Unique Student Roll Number e.g. DCE-2024-CS042")
    name: str
    rollNumber: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = "Computer Science & Engineering"
    yearOfStudy: Optional[int] = 3
    batch: Optional[str] = "2022-2026"
    section: Optional[str] = "A"
    rfidUid: Optional[str] = None
    qrToken: Optional[str] = None
    permittedBusIds: List[str] = ["bus-07"]
    permittedRouteIds: List[str] = ["route-07"]
    designatedStopId: Optional[str] = None
    designatedStopName: Optional[str] = "Tambaram West Stand"
    parentPhone: Optional[str] = ""


class AttendanceSessionCreateRequest(BaseModel):
    sessionName: str = Field(..., min_length=3, max_length=128)
    sessionType: str = Field("BUS_BOARDING", description="BUS_BOARDING | CLASSROOM | EXAM_HALL")
    busId: Optional[str] = None
    routeId: Optional[str] = None
    tripId: Optional[str] = None
    department: Optional[str] = "All Departments"
    subjectOrStop: Optional[str] = None
    similarityThreshold: Optional[float] = Field(0.82, ge=0.50, le=0.99)
    requireLiveness: Optional[bool] = True


class FaceEnrollmentRequest(BaseModel):
    studentId: str = Field(..., description="Student ID in dce_student_db e.g. DCE-2024-CS042")
    consentGranted: bool = Field(..., description="Explicit informed consent required for biometric enrollment")
    consentText: Optional[str] = "I hereby consent to the encrypted storage of my facial biometric template for Dhanalakshmi College of Engineering bus and classroom attendance verification."
    imageBase64: Optional[str] = Field(None, description="Base64-encoded PNG/JPEG/WEBP face image")
    sampleImagesBase64: Optional[List[str]] = Field(None, description="Multiple face samples for higher quality template")
    livenessScore: Optional[float] = Field(None, ge=0.0, le=1.0)


class FaceVerificationRequest(BaseModel):
    sessionId: str = Field(..., description="Active AttendanceSession ID")
    studentId: Optional[str] = Field(None, description="Optional claimed student ID for 1:1 verification; if omitted performs 1:N search")
    imageBase64: Optional[str] = Field(None, description="Base64-encoded PNG/JPEG/WEBP live camera frame")
    livenessScore: Optional[float] = Field(None, ge=0.0, le=1.0)
    busId: Optional[str] = None
    routeId: Optional[str] = None
    stopId: Optional[str] = None
    stopName: Optional[str] = None
    eventType: Optional[str] = "BOARDING"  # BOARDING | EXIT | CLASSROOM_PRESENT
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    deviceId: Optional[str] = "face-term-01"


class AttendanceReviewRequest(BaseModel):
    decision: str = Field(..., description="MANUAL_APPROVED | MANUAL_REJECTED | FLAGGED_FOR_REVIEW")
    eventType: Optional[str] = None
    stopName: Optional[str] = None
    isAuthorized: Optional[bool] = None
    remarks: str = Field(..., min_length=3, description="Mandatory audit justification for manual attendance review")


class AttendanceTapRequest(BaseModel):
    eventId: Optional[str] = Field(None, description="Deterministic event ID from Pi agent for idempotency")
    studentIdentifier: str = Field(..., description="RFID UID, QR Token, or Student Roll ID")
    busId: str
    routeId: Optional[str] = None
    stopId: Optional[str] = None
    stopName: Optional[str] = None
    eventType: Optional[str] = "BOARDING"  # BOARDING | EXIT
    deviceId: Optional[str] = "pi-bus-07"
    timestamp: Optional[int] = None  # Epoch milliseconds captured on device
    syncStatus: Optional[str] = "REALTIME"  # REALTIME | OFFLINE_SYNCED
    sessionId: Optional[str] = None


class AttendanceBatchSyncRequest(BaseModel):
    deviceId: str
    busId: str
    records: List[AttendanceTapRequest]


class AttendanceCorrectionRequest(BaseModel):
    eventType: Optional[str] = None
    stopName: Optional[str] = None
    isAuthorized: Optional[bool] = None
    remarks: str = Field(..., description="Reason for administrative attendance modification")
