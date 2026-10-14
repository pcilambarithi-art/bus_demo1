from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer
from ..database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(64), primary_key=True, index=True) # e.g. "pi-bus-07"
    bus_id = Column(String(64), index=True, nullable=False) # Bound bus ID, e.g. "bus-07"
    device_name = Column(String(128), default="Raspberry Pi 5 Bus Agent")
    api_key_hash = Column(String(256), nullable=False)
    hardware_model = Column(String(64), default="Raspberry Pi 5 4GB")
    modem_model = Column(String(64), default="Huawei E3372 4G LTE")
    firmware_version = Column(String(32), default="1.0.0")
    ip_address = Column(String(64), default="100.64.0.10")
    signal_csq = Column(Integer, default=24) # CSQ 0-31
    gps_fix_status = Column(String(32), default="3D_FIX") # NO_FIX, 2D_FIX, 3D_FIX
    battery_voltage = Column(Float, default=13.8) # 12V/24V bus electrical system
    cpu_temp_c = Column(Float, default=42.0)
    cpu_usage_pct = Column(Float, default=14.5)
    ram_usage_pct = Column(Float, default=32.0)
    disk_usage_pct = Column(Float, default=28.4)
    satellites_locked = Column(Integer, default=9)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
