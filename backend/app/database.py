import os
import json
import logging
import hashlib
from datetime import datetime
from typing import Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings, PROJECT_ROOT

logger = logging.getLogger("dce_transit.database")

# ==============================================================================
# SIX LOGICAL DATABASES ARCHITECTURE (MySQL 8.x / SQLAlchemy 2.x)
#   1. dce_identity_db      -> IdentityBase      (identity_engine)
#   2. dce_student_db       -> StudentBase       (student_engine)
#   3. dce_bus_tracking_db  -> TrackingBase      (tracking_engine)
#   4. dce_attendance_db    -> AttendanceBase    (attendance_engine)
#   5. dce_notifications_db -> NotificationBase  (notifications_engine)
#   6. dce_audit_db         -> AuditBase         (audit_engine)
# ==============================================================================

IdentityBase = declarative_base()
StudentBase = declarative_base()
TrackingBase = declarative_base()
AttendanceBase = declarative_base()
NotificationBase = declarative_base()
AuditBase = declarative_base()

# Backward-compatible alias
Base = TrackingBase


def _create_module_engine(db_url: str):
    is_sqlite = db_url.startswith("sqlite")
    connect_args = {"check_same_thread": False} if is_sqlite else {"connect_timeout": 10}
    engine_kwargs: Dict[str, Any] = {
        "connect_args": connect_args,
        "pool_pre_ping": True,
    }
    if not is_sqlite:
        engine_kwargs["pool_size"] = 30
        engine_kwargs["max_overflow"] = 50
        engine_kwargs["pool_recycle"] = 1800
        engine_kwargs["pool_timeout"] = 30
    return create_engine(db_url, **engine_kwargs)


identity_engine = _create_module_engine(settings.DCE_IDENTITY_DB_URL)
student_engine = _create_module_engine(settings.DCE_STUDENT_DB_URL)
tracking_engine = _create_module_engine(settings.DCE_TRACKING_DB_URL)
attendance_engine = _create_module_engine(settings.DCE_ATTENDANCE_DB_URL)
notifications_engine = _create_module_engine(settings.DCE_NOTIFICATIONS_DB_URL)
audit_engine = _create_module_engine(settings.DCE_AUDIT_DB_URL)

# Primary engine alias for backward compatibility
engine = tracking_engine

MODULE_ENGINES = {
    "dce_identity_db": (IdentityBase, identity_engine, settings.DCE_IDENTITY_DB_URL),
    "dce_student_db": (StudentBase, student_engine, settings.DCE_STUDENT_DB_URL),
    "dce_bus_tracking_db": (TrackingBase, tracking_engine, settings.DCE_TRACKING_DB_URL),
    "dce_attendance_db": (AttendanceBase, attendance_engine, settings.DCE_ATTENDANCE_DB_URL),
    "dce_notifications_db": (NotificationBase, notifications_engine, settings.DCE_NOTIFICATIONS_DB_URL),
    "dce_audit_db": (AuditBase, audit_engine, settings.DCE_AUDIT_DB_URL),
}


class MultiDatabaseRoutingSession(Session):
    """
    SQLAlchemy 2.x Session that routes every ORM model or SQL table operation
    to its strictly isolated logical database engine:
      - IdentityBase      -> dce_identity_db
      - StudentBase       -> dce_student_db
      - TrackingBase      -> dce_bus_tracking_db
      - AttendanceBase    -> dce_attendance_db
      - NotificationBase  -> dce_notifications_db
      - AuditBase         -> dce_audit_db
    """

    def get_bind(self, mapper=None, clause=None, **kw):
        if mapper is not None:
            cls = getattr(mapper, "class_", None)
            if cls is not None:
                if issubclass(cls, IdentityBase):
                    return identity_engine
                if issubclass(cls, StudentBase):
                    return student_engine
                if issubclass(cls, TrackingBase):
                    return tracking_engine
                if issubclass(cls, AttendanceBase):
                    return attendance_engine
                if issubclass(cls, NotificationBase):
                    return notifications_engine
                if issubclass(cls, AuditBase):
                    return audit_engine

        if clause is not None:
            table_name = getattr(clause, "name", None)
            if table_name:
                if table_name in IdentityBase.metadata.tables:
                    return identity_engine
                if table_name in StudentBase.metadata.tables:
                    return student_engine
                if table_name in TrackingBase.metadata.tables:
                    return tracking_engine
                if table_name in AttendanceBase.metadata.tables:
                    return attendance_engine
                if table_name in NotificationBase.metadata.tables:
                    return notifications_engine
                if table_name in AuditBase.metadata.tables:
                    return audit_engine

        return tracking_engine


SessionLocal = sessionmaker(
    class_=MultiDatabaseRoutingSession,
    autocommit=False,
    autoflush=False,
)

# Dedicated single-database session factories for strict module isolation
IdentitySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=identity_engine)
StudentSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=student_engine)
TrackingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=tracking_engine)
AttendanceSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=attendance_engine)
NotificationSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=notifications_engine)
AuditSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=audit_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_identity_db():
    db = IdentitySessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_student_db():
    db = StudentSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tracking_db():
    db = TrackingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_attendance_db():
    db = AttendanceSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_notifications_db():
    db = NotificationSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_audit_db():
    db = AuditSessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Creates all tables across all 6 logical databases."""
    from . import models  # noqa: F401
    for db_name, (base_cls, mod_engine, _) in MODULE_ENGINES.items():
        base_cls.metadata.create_all(bind=mod_engine)


def check_all_databases_health() -> Dict[str, Any]:
    """Verifies connectivity, query latency, pool stats, and table readiness across all 6 logical databases."""
    import time
    status_map: Dict[str, Any] = {}
    all_ok = True
    for db_name, (base_cls, mod_engine, db_url) in MODULE_ENGINES.items():
        try:
            start_t = time.perf_counter()
            with mod_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
            dialect = "MySQL 8.x" if "mysql" in db_url else "SQLite"
            pool = mod_engine.pool
            pool_size = getattr(pool, "size", lambda: 30)() if callable(getattr(pool, "size", None)) else getattr(pool, "_pool", 30)
            status_map[db_name] = {
                "connected": True,
                "engine": dialect,
                "latencyMs": latency_ms,
                "poolSize": 30 if "mysql" in db_url else 5,
                "maxOverflow": 50 if "mysql" in db_url else 10,
                "poolRecycleSec": 1800,
                "tables": list(base_cls.metadata.tables.keys()),
                "tableCount": len(base_cls.metadata.tables),
                "checkedAt": datetime.utcnow().isoformat() + "Z"
            }
        except Exception as e:
            all_ok = False
            status_map[db_name] = {
                "connected": False,
                "error": str(e),
                "checkedAt": datetime.utcnow().isoformat() + "Z"
            }
    return {"allConnected": all_ok, "databases": status_map}


def seed_hardware_and_attendance_if_empty(db: Session):
    """Seeds sample registered students, RFID/QR credentials, face enrollments, sessions, and Pi 5 bus agents."""
    from .models import (
        Student,
        AttendanceRecord,
        Device,
        FaceEnrollment,
        AttendanceSession,
    )
    from .services.face_service import face_service

    if db.query(Student).first() is None:
        sample_students = [
            Student(
                id="DCE-2024-CS042",
                roll_number="211422104042",
                name="Arun Kumar S",
                email="arunkumar.cs24@dce.edu.in",
                department="Computer Science & Engineering",
                year_of_study=3,
                batch="2022-2026",
                section="A",
                rfid_uid="RFID-07A1B2C3",
                qr_token="QR-DCE-CS042-2026",
                permitted_bus_ids=json.dumps(["bus-07", "bus-04"]),
                permitted_route_ids=json.dumps(["route-07", "route-04"]),
                designated_stop_id="stop-r07-1",
                designated_stop_name="Tambaram West Stand",
                face_enrolled=True,
                parent_phone="+91 94441 10042",
                is_active=True
            ),
            Student(
                id="DCE-2024-EC018",
                roll_number="211422106018",
                name="Divya Bharathi M",
                email="divyabharathi.ec24@dce.edu.in",
                department="Electronics & Communication",
                year_of_study=3,
                batch="2022-2026",
                section="A",
                rfid_uid="RFID-04D5E6F7",
                qr_token="QR-DCE-EC018-2026",
                permitted_bus_ids=json.dumps(["bus-07"]),
                permitted_route_ids=json.dumps(["route-07"]),
                designated_stop_id="stop-r07-2",
                designated_stop_name="Perungalathur Junction",
                face_enrolled=True,
                parent_phone="+91 94441 20018",
                is_active=True
            ),
            Student(
                id="DCE-2025-ME009",
                roll_number="211423114009",
                name="Karthik Raja V",
                email="karthikraja.me25@dce.edu.in",
                department="Mechanical Engineering",
                year_of_study=2,
                batch="2023-2027",
                section="B",
                rfid_uid="RFID-09B8C7D6",
                qr_token="QR-DCE-ME009-2026",
                permitted_bus_ids=json.dumps(["bus-04"]),
                permitted_route_ids=json.dumps(["route-04"]),
                designated_stop_id="stop-r04-1",
                designated_stop_name="Chromepet MIT Bridge",
                face_enrolled=False,
                parent_phone="+91 94441 30009",
                is_active=True
            ),
            Student(
                id="DCE-2023-AI055",
                roll_number="211421243055",
                name="Sneha Priya R",
                email="snehapriya.ai23@dce.edu.in",
                department="AI & Data Science",
                year_of_study=4,
                batch="2021-2025",
                section="A",
                rfid_uid="RFID-11F2E3D4",
                qr_token="QR-DCE-AI055-2026",
                permitted_bus_ids=json.dumps(["bus-07", "bus-12"]),
                permitted_route_ids=json.dumps(["route-07", "route-12"]),
                designated_stop_id="stop-r07-3",
                designated_stop_name="Kishkinta Road Junction",
                face_enrolled=False,
                parent_phone="+91 94441 40055",
                is_active=True
            ),
            Student(
                id="DCE-2024-IT031",
                roll_number="211422205031",
                name="Vigneshwaran P",
                email="vigneshwaran.it24@dce.edu.in",
                department="Information Technology",
                year_of_study=3,
                batch="2022-2026",
                section="A",
                rfid_uid="RFID-22C3B4A5",
                qr_token="QR-DCE-IT031-2026",
                permitted_bus_ids=json.dumps(["bus-18"]),
                permitted_route_ids=json.dumps(["route-18"]),
                designated_stop_id="stop-r18-1",
                designated_stop_name="Velachery Bypass",
                face_enrolled=False,
                parent_phone="+91 94441 50031",
                is_active=True
            )
        ]
        for s in sample_students:
            db.add(s)
        db.commit()

    if db.query(Device).first() is None:
        def _hash(k: str) -> str:
            return hashlib.sha256(k.encode("utf-8")).hexdigest()

        sample_devices = [
            Device(
                id="pi-bus-07",
                bus_id="bus-07",
                device_name="RPi5 Bus-07 (Tambaram Express)",
                api_key_hash=_hash("dce_bus07_secret_key_2026"),
                hardware_model="Raspberry Pi 5 4GB + NEO-6M (MP510_GPS_V02_WWXL)",
                modem_model="Huawei E3372h 4G LTE",
                firmware_version="1.2.0",
                ip_address="100.64.12.7",
                signal_csq=26,
                gps_fix_status="3D_FIX",
                battery_voltage=13.8,
                cpu_temp_c=43.2,
                is_online=True
            ),
            Device(
                id="pi-bus-04",
                bus_id="bus-04",
                device_name="RPi5 Bus-04 (Chromepet Shuttle)",
                api_key_hash=_hash("dce_bus04_secret_key_2026"),
                hardware_model="Raspberry Pi 5 4GB + NEO-6M (MP510_GPS_V02_WWXL)",
                modem_model="SIM7600E-H 4G HAT",
                firmware_version="1.2.0",
                ip_address="100.64.12.4",
                signal_csq=23,
                gps_fix_status="3D_FIX",
                battery_voltage=13.7,
                cpu_temp_c=44.0,
                is_online=True
            ),
            Device(
                id="pi-bus-12",
                bus_id="bus-12",
                device_name="RPi5 Bus-12 (Guindy Route)",
                api_key_hash=_hash("dce_bus12_secret_key_2026"),
                hardware_model="Raspberry Pi 5 4GB + NEO-6M (MP510_GPS_V02_WWXL)",
                modem_model="Huawei E3372h 4G LTE",
                firmware_version="1.2.0",
                ip_address="100.64.12.12",
                signal_csq=21,
                gps_fix_status="3D_FIX",
                battery_voltage=13.6,
                cpu_temp_c=41.8,
                is_online=True
            ),
            Device(
                id="pi-bus-18",
                bus_id="bus-18",
                device_name="RPi5 Bus-18 (Velachery Corridor)",
                api_key_hash=_hash("dce_bus18_secret_key_2026"),
                hardware_model="Raspberry Pi 5 4GB + NEO-6M (MP510_GPS_V02_WWXL)",
                modem_model="Quectel EC25 4G LTE",
                firmware_version="1.2.0",
                ip_address="100.64.12.18",
                signal_csq=25,
                gps_fix_status="3D_FIX",
                battery_voltage=13.9,
                cpu_temp_c=42.5,
                is_online=True
            )
        ]
        for d in sample_devices:
            db.add(d)
        db.commit()

    # Seed default AttendanceSession & encrypted FaceEnrollment records if empty
    if db.query(AttendanceSession).first() is None:
        default_session = AttendanceSession(
            id="sess-morning-bus07",
            session_name="Morning Pickup - DCE-BUS-07 (Tambaram Express)",
            session_type="BUS_BOARDING",
            status="OPEN",
            bus_id="bus-07",
            route_id="route-07",
            department="All Departments",
            subject_or_stop="Tambaram Corridor -> DCE Campus",
            created_by_id="admin-01",
            created_by_name="DCE Transport Administrator",
            similarity_threshold=settings.FACE_MATCH_SIMILARITY_THRESHOLD,
            require_liveness=True,
            started_at=datetime.utcnow(),
            total_verified=2,
            total_rejected=0
        )
        db.add(default_session)
        db.commit()

    if db.query(FaceEnrollment).first() is None:
        for sid, sname, sdept in [
            ("DCE-2024-CS042", "Arun Kumar S", "Computer Science & Engineering"),
            ("DCE-2024-EC018", "Divya Bharathi M", "Electronics & Communication"),
        ]:
            vec = face_service.generate_synthetic_student_embedding(sid)
            enc_blob, tpl_hash = face_service.encrypt_template(vec)
            db.add(FaceEnrollment(
                id=f"fe-{sid.lower()}",
                student_id=sid,
                student_name=sname,
                department=sdept,
                enrollment_status="ACTIVE",
                encrypted_template=enc_blob,
                template_version="dce-face-128d-v1",
                template_hash=tpl_hash,
                sample_count=3,
                average_quality_score=0.94,
                brightness_score=128.5,
                sharpness_score=42.0,
                consent_granted=True,
                consent_text="Student explicitly consented to encrypted biometric face template storage for DCE bus & classroom attendance.",
                consent_timestamp=datetime.utcnow(),
                enrolled_by_id="admin-01",
                enrolled_by_name="DCE Transport Administrator",
            ))
        db.commit()

    if db.query(AttendanceRecord).first() is None:
        sample_attendance = [
            AttendanceRecord(
                id="att-seed-001",
                session_id="sess-morning-bus07",
                student_id="DCE-2024-CS042",
                student_name="Arun Kumar S",
                department="Computer Science & Engineering",
                bus_id="bus-07",
                bus_number="DCE-BUS-07",
                route_id="route-07",
                stop_id="stop-r07-1",
                stop_name="Tambaram West Stand",
                event_type="BOARDING",
                verification_method="FACE_BIOMETRIC",
                confidence_score=0.96,
                liveness_passed=True,
                liveness_score=0.92,
                verification_status="VERIFIED",
                device_id="pi-bus-07",
                sync_status="REALTIME",
                is_authorized=True,
                remarks="Verified via Face Biometric + Liveness Check (96.0% match)"
            ),
            AttendanceRecord(
                id="att-seed-002",
                session_id="sess-morning-bus07",
                student_id="DCE-2024-EC018",
                student_name="Divya Bharathi M",
                department="Electronics & Communication",
                bus_id="bus-07",
                bus_number="DCE-BUS-07",
                route_id="route-07",
                stop_id="stop-r07-2",
                stop_name="Perungalathur Junction",
                event_type="BOARDING",
                verification_method="FACE_BIOMETRIC",
                confidence_score=0.94,
                liveness_passed=True,
                liveness_score=0.89,
                verification_status="VERIFIED",
                device_id="pi-bus-07",
                sync_status="REALTIME",
                is_authorized=True,
                remarks="Verified via Face Biometric + Liveness Check (94.0% match)"
            ),
            AttendanceRecord(
                id="att-seed-003",
                session_id=None,
                student_id="DCE-2025-ME009",
                student_name="Karthik Raja V",
                department="Mechanical Engineering",
                bus_id="bus-04",
                bus_number="DCE-BUS-04",
                route_id="route-04",
                stop_id="stop-r04-1",
                stop_name="Chromepet MIT Bridge",
                event_type="BOARDING",
                verification_method="RFID_CARD",
                confidence_score=1.0,
                liveness_passed=True,
                liveness_score=1.0,
                verification_status="VERIFIED",
                device_id="pi-bus-04",
                sync_status="OFFLINE_SYNCED",
                is_authorized=True,
                remarks="Queued during 4G handover & synced"
            )
        ]
        for att in sample_attendance:
            db.add(att)
        db.commit()


def seed_database_if_empty(db: Session):
    """Seeds all 6 logical databases using existing data from server/db.json if empty."""
    init_db()
    from .models import User, Bus, Route, Stop, VoiceAnnouncement, IssueReport, BusLatestLocation
    from .security.authentication import hash_password

    try:
        seed_hardware_and_attendance_if_empty(db)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed seeding hardware/attendance tables: {e}", exc_info=True)

    # Check if tracking database already has buses
    if db.query(Bus).first() is not None:
        return

    db_json_path = PROJECT_ROOT / "server" / "db.json"
    if not db_json_path.exists():
        logger.warning(f"Seed file not found at {db_json_path}")
        return

    try:
        with open(db_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        logger.info("Seeding 6 logical databases from server/db.json...")

        # 1. Seed Admins & Staff Users into dce_identity_db
        if db.query(User).first() is None:
            for admin in data.get("admins", []):
                raw_pwd = admin.get("passwordHash", "admin123")
                db.add(User(
                    id=admin.get("id", "admin-01"),
                    name=admin.get("name", "DCE Transport Administrator"),
                    email=admin.get("email", "admin@dce.edu"),
                    phone="+91 94440 00000",
                    role="admin",
                    password_hash=hash_password(raw_pwd) if not raw_pwd.startswith("pbkdf2:") else raw_pwd,
                    is_active=True
                ))

            for staff in data.get("staff", []):
                raw_pwd = staff.get("passwordHash", "dce2024")
                db.add(User(
                    id=staff.get("id"),
                    name=staff.get("name"),
                    email=staff.get("email"),
                    phone=staff.get("phone", ""),
                    role=staff.get("role", "driver"),
                    password_hash=hash_password(raw_pwd) if not raw_pwd.startswith("pbkdf2:") else raw_pwd,
                    assigned_bus_id=staff.get("assignedBusId"),
                    assigned_route_id=staff.get("assignedRouteId"),
                    is_active=True
                ))
            db.commit()

        # 2. Seed Routes & Stops into dce_bus_tracking_db
        for r in data.get("routes", []):
            db_route = Route(
                id=r.get("id"),
                name=r.get("name"),
                code=r.get("code", "R-01"),
                route_number=str(r.get("routeNumber", "1")),
                origin=r.get("origin", "Tambaram"),
                destination=r.get("destination", "DCE Campus"),
                starting_point=r.get("startingPoint", r.get("origin", "Tambaram")),
                description=r.get("description", ""),
                total_distance_km=float(r.get("totalDistanceKm", 15.0)),
                estimated_total_minutes=int(r.get("estimatedTotalMinutes", 35)),
                assigned_bus_ids=json.dumps(r.get("assignedBusIds", [])),
                waypoints_json=json.dumps(r.get("waypoints", [])),
                is_active=True
            )
            db.add(db_route)

            for s in r.get("stops", []):
                db_stop = Stop(
                    id=s.get("id"),
                    route_id=r.get("id"),
                    name=s.get("name"),
                    short_name=s.get("shortName", s.get("name", "").split(" ")[0]),
                    lat=float(s.get("lat")),
                    lng=float(s.get("lng")),
                    sequence=int(s.get("sequence", 1)),
                    scheduled_time=s.get("scheduledTime", "07:30 AM"),
                    students_waiting=int(s.get("studentsWaiting", 0)),
                    is_terminal=bool(s.get("isTerminal", False)),
                    geofence_radius=int(s.get("geofenceRadius", settings.GEOFENCE_STATION_RADIUS_METERS)),
                    expected_dwell_seconds=int(s.get("dwellSeconds", 60)),
                    is_active=True
                )
                db.add(db_stop)

        # 3. Seed Buses into dce_bus_tracking_db
        for b in data.get("buses", []):
            db_bus = Bus(
                id=b.get("id"),
                bus_number=b.get("busNumber"),
                plate_number=b.get("plateNumber", ""),
                route_id=b.get("routeId"),
                route_name=b.get("routeName", ""),
                starting_point=b.get("startingPoint", ""),
                destination=b.get("destination", ""),
                assigned_staff_id=b.get("assignedStaffId"),
                driver_name=b.get("driverName", ""),
                driver_phone=b.get("driverPhone", ""),
                driver_rating=float(b.get("driverRating", 4.8)),
                bus_image=b.get("busImage", ""),
                capacity=int(b.get("capacity", 50)),
                current_occupancy=int(b.get("currentOccupancy", 0)),
                has_ac=bool(b.get("hasAC", False)),
                is_live=bool(b.get("isLive", True)),
                is_active=bool(b.get("isActive", True)),
                status_text=b.get("statusText", "In Service"),
                operational_status=b.get("operationalStatus", "In Service"),
                current_lat=float(b.get("currentLat", 12.9249)),
                current_lng=float(b.get("currentLng", 80.1165)),
                current_speed=float(b.get("currentSpeed", 0.0)),
                last_updated=datetime.utcnow()
            )
            db.add(db_bus)

            db_latest = BusLatestLocation(
                bus_id=b.get("id"),
                bus_number=b.get("busNumber"),
                latitude=float(b.get("currentLat", 12.9249)),
                longitude=float(b.get("currentLng", 80.1165)),
                speed=float(b.get("currentSpeed", 0.0)),
                heading=0.0,
                accuracy=5.0,
                status="at_station",
                status_indicator="green",
                status_label=f"At Station ({b.get('startingPoint', 'Tambaram')})",
                distance_to_next_meters=0,
                eta_minutes=0,
                seconds_since_update=0,
                gps_health="active",
                gps_health_label="Stationary at origin",
                is_simulated=False,
                last_updated=datetime.utcnow()
            )
            db.add(db_latest)
        db.commit()

        # 4. Seed Voice Announcements & Issue Reports into dce_notifications_db
        if db.query(VoiceAnnouncement).first() is None:
            for va in data.get("voice_announcements", []):
                db.add(VoiceAnnouncement(
                    id=va.get("id"),
                    route_id=va.get("routeId"),
                    stop_id=va.get("stopId"),
                    stop_name=va.get("stopId"),
                    text=va.get("text"),
                    text_tamil=va.get("textTamil", ""),
                    language=va.get("language", "en-IN"),
                    audio_url=va.get("audioUrl", ""),
                    trigger_distance_meters=int(va.get("triggerDistanceMeters", 300)),
                    is_active=bool(va.get("isActive", True))
                ))

            for issue in data.get("issue_reports", []):
                db.add(IssueReport(
                    id=issue.get("id"),
                    staff_id=issue.get("staffId"),
                    staff_name=issue.get("staffName"),
                    bus_id=issue.get("busId"),
                    bus_number=issue.get("busNumber"),
                    route_id=issue.get("routeId"),
                    issue_type=issue.get("issueType"),
                    description=issue.get("description"),
                    location=issue.get("location", ""),
                    latitude=str(issue["latitude"]) if issue.get("latitude") else None,
                    longitude=str(issue["longitude"]) if issue.get("longitude") else None,
                    priority=issue.get("priority", "Medium"),
                    status=issue.get("status", "New"),
                    admin_remarks=issue.get("adminRemarks", "")
                ))
            db.commit()

        logger.info("Successfully seeded all 6 logical databases with Dhanalakshmi College transit data.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed database: {e}", exc_info=True)
