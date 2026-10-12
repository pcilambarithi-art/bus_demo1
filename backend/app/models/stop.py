from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey
from ..database import Base

class Stop(Base):
    __tablename__ = "stops"

    id = Column(String(64), primary_key=True, index=True)
    route_id = Column(String(64), ForeignKey("routes.id"), index=True, nullable=False)
    name = Column(String(128), nullable=False)
    short_name = Column(String(64), default="")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    sequence = Column(Integer, nullable=False, default=1)
    scheduled_time = Column(String(32), default="07:30 AM")
    students_waiting = Column(Integer, default=0)
    is_terminal = Column(Boolean, default=False)
    geofence_radius = Column(Integer, default=60) # in meters
    expected_dwell_seconds = Column(Integer, default=60) # in seconds
    is_active = Column(Boolean, default=True)
