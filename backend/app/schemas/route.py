from typing import Optional, List, Any
from pydantic import BaseModel

class RouteCreate(BaseModel):
    id: Optional[str] = None
    name: str
    code: Optional[str] = None
    routeNumber: Optional[str] = None
    origin: Optional[str] = "Tambaram"
    destination: Optional[str] = "DCE Campus, Manimangalam"
    startingPoint: Optional[str] = "Tambaram"
    description: Optional[str] = None
    totalDistanceKm: Optional[float] = 15.0
    estimatedTotalMinutes: Optional[int] = 35
    assignedBusIds: Optional[List[str]] = []
    stops: Optional[List[dict]] = []
    waypoints: Optional[List[List[float]]] = []

class RouteUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    routeNumber: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    startingPoint: Optional[str] = None
    description: Optional[str] = None
    totalDistanceKm: Optional[float] = None
    estimatedTotalMinutes: Optional[int] = None
    assignedBusIds: Optional[List[str]] = None
    stops: Optional[List[dict]] = None
    waypoints: Optional[List[List[float]]] = None
    isActive: Optional[bool] = None
