from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from ..database import NotificationBase


class VoiceAnnouncement(NotificationBase):
    __tablename__ = "voice_announcements"

    id = Column(String(64), primary_key=True, index=True)
    route_id = Column(String(64), index=True, nullable=False)
    stop_id = Column(String(64), index=True, nullable=False)
    stop_name = Column(String(128), default="")
    text = Column(Text, nullable=False)
    text_tamil = Column(Text, default="")
    language = Column(String(16), default="en-IN")
    audio_url = Column(String(512), default="")
    trigger_distance_meters = Column(Integer, default=300)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class IssueReport(NotificationBase):
    __tablename__ = "issue_reports"

    id = Column(String(64), primary_key=True, index=True)
    staff_id = Column(String(64), index=True, nullable=True)
    staff_name = Column(String(128), default="Bus Driver")
    bus_id = Column(String(64), index=True, nullable=False)
    bus_number = Column(String(32), default="DCE-BUS-07")
    route_id = Column(String(64), index=True, default="route-07")
    issue_type = Column(String(64), default="Mechanical Problem")
    description = Column(Text, nullable=False)
    photo_url = Column(String(512), default="")
    location = Column(String(128), default="On Route")
    latitude = Column(String(32), nullable=True)
    longitude = Column(String(32), nullable=True)
    priority = Column(String(16), default="Medium")  # Low | Medium | High | Critical
    status = Column(String(32), default="New")  # New | In Progress | Resolved | Closed
    admin_remarks = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NotificationRecord(NotificationBase):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True, index=True)
    dedup_key = Column(String(128), unique=True, index=True, nullable=True)
    recipient_role = Column(String(32), default="all")  # all | student | staff | admin
    recipient_id = Column(String(64), nullable=True, index=True)
    bus_id = Column(String(64), index=True, nullable=True)
    event_id = Column(String(64), nullable=True)
    title = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(32), default="in_app")  # in_app | sse | fcm
    status = Column(String(32), default="delivered")  # delivered | pending | failed
    error_details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class NotificationPreference(NotificationBase):
    __tablename__ = "notification_preferences"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), unique=True, index=True, nullable=False)
    role = Column(String(32), default="student")
    bus_id = Column(String(64), index=True, nullable=True)
    route_id = Column(String(64), index=True, nullable=True)
    stop_id = Column(String(64), nullable=True)
    enable_arrival_alerts = Column(Boolean, default=True)
    enable_delay_alerts = Column(Boolean, default=True)
    enable_attendance_alerts = Column(Boolean, default=True)
    preferred_channel = Column(String(32), default="in_app")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
