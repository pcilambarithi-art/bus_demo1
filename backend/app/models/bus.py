from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime
from ..database import TrackingBase


class Bus(TrackingBase):
    __tablename__ = "buses"

    id = Column(String(64), primary_key=True, index=True)
    bus_number = Column(String(32), unique=True, index=True, nullable=False)
    plate_number = Column(String(32), nullable=False)
    route_id = Column(String(64), index=True, nullable=True)
    route_name = Column(String(128), default="")
    starting_point = Column(String(128), default="")
    destination = Column(String(128), default="")
    assigned_staff_id = Column(String(64), index=True, nullable=True)
    driver_name = Column(String(128), default="")
    driver_phone = Column(String(32), default="")
    driver_rating = Column(Float, default=4.8)
    bus_image = Column(String(512), default="")
    capacity = Column(Integer, default=50)
    current_occupancy = Column(Integer, default=0)
    has_ac = Column(Boolean, default=False)
    is_live = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    status_text = Column(String(128), default="In Service")
    operational_status = Column(String(64), default="In Service")
    current_lat = Column(Float, default=12.9249)
    current_lng = Column(Float, default=80.1165)
    current_speed = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Trip(TrackingBase):
    """Stored in dce_bus_tracking_db (`trips` table)."""
    __tablename__ = "trips"

    id = Column(String(64), primary_key=True, index=True)
    bus_id = Column(String(64), index=True, nullable=False)
    bus_number = Column(String(32), index=True, nullable=False)
    route_id = Column(String(64), index=True, nullable=False)
    driver_id = Column(String(64), index=True, nullable=True)
    device_id = Column(String(64), nullable=True)
    trip_type = Column(String(32), default="MORNING_PICKUP")  # MORNING_PICKUP | EVENING_DROP | SPECIAL
    status = Column(String(32), default="ACTIVE", index=True)  # ACTIVE | COMPLETED | CANCELLED
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)
    start_lat = Column(Float, nullable=True)
    start_lng = Column(Float, nullable=True)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)
    total_distance_km = Column(Float, default=0.0)
    boarded_count = Column(Integer, default=0)
