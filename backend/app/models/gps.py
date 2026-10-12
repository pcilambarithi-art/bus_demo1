from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, Index
from ..database import Base

class GPSHistory(Base):
    __tablename__ = "gps_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bus_id = Column(String(64), index=True, nullable=False)
    bus_number = Column(String(32), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, default=0.0) # km/h
    heading = Column(Float, default=0.0) # degrees
    accuracy = Column(Float, default=5.0) # meters
    is_simulated = Column(Boolean, default=False)
    is_valid = Column(Boolean, default=True)
    rejection_reason = Column(String(128), nullable=True)
    device_timestamp = Column(DateTime, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_gps_bus_time", "bus_id", "received_at"),
    )

class BusLatestLocation(Base):
    __tablename__ = "bus_latest_location"

    bus_id = Column(String(64), primary_key=True, index=True)
    bus_number = Column(String(32), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    accuracy = Column(Float, default=5.0)
    status = Column(String(32), default="at_station") # at_station | moving | destination | stale
    status_indicator = Column(String(16), default="green") # green | red | yellow | grey
    status_label = Column(String(128), default="At Station")
    current_station_id = Column(String(64), nullable=True)
    current_station_name = Column(String(128), nullable=True)
    next_station_id = Column(String(64), nullable=True)
    next_station_name = Column(String(128), nullable=True)
    distance_to_next_meters = Column(Integer, default=0)
    eta_minutes = Column(Integer, default=0)
    seconds_since_update = Column(Integer, default=0)
    gps_health = Column(String(32), default="active") # active | weak | offline
    gps_health_label = Column(String(128), default="Live GPS Active")
    is_simulated = Column(Boolean, default=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)

class ArrivalDepartureEvent(Base):
    __tablename__ = "arrival_departure_events"

    id = Column(String(64), primary_key=True, index=True)
    bus_id = Column(String(64), index=True, nullable=False)
    bus_number = Column(String(32), index=True, nullable=False)
    station_id = Column(String(64), index=True, nullable=False)
    station_name = Column(String(128), nullable=False)
    sequence = Column(Integer, default=1)
    event_type = Column(String(32), nullable=False) # APPROACHING | ARRIVED | WAITING | DEPARTED | DESTINATION
    indicator = Column(String(16), default="green") # green | red | yellow | grey
    speed_kmh = Column(Float, default=0.0)
    title = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    event_timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_ev_bus_station_type", "bus_id", "station_id", "event_type"),
    )
