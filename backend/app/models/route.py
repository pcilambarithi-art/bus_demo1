from sqlalchemy import Column, String, Float, Integer, Boolean, Text
from ..database import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    code = Column(String(32), unique=True, index=True, nullable=False)
    route_number = Column(String(32), default="1")
    origin = Column(String(128), default="Tambaram")
    destination = Column(String(128), default="DCE Campus")
    starting_point = Column(String(128), default="Tambaram")
    description = Column(Text, default="")
    total_distance_km = Column(Float, default=15.0)
    estimated_total_minutes = Column(Integer, default=35)
    assigned_bus_ids = Column(Text, default="[]") # JSON list of string IDs
    waypoints_json = Column(Text, default="[]") # JSON list of [lat, lng] pairs
    is_active = Column(Boolean, default=True)
