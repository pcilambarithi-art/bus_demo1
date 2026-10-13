import os
import json
import logging
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings, PROJECT_ROOT

logger = logging.getLogger("dce_transit.database")

# SQLite connection args
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Ensures all model tables are registered and created in SQLite."""
    from . import models
    Base.metadata.create_all(bind=engine)

def seed_hardware_and_attendance_if_empty(db: Session):
    """Seeds sample registered students, RFID/QR credentials, and Raspberry Pi 5 bus agent devices."""
    import hashlib
    from .models import Student, AttendanceRecord, Device

    if db.query(Student).first() is None:
        sample_students = [
            Student(
                id="DCE-2024-CS042",
                name="Arun Kumar S",
                department="Computer Science & Engineering",
                batch="2022-2026",
                rfid_uid="RFID-07A1B2C3",
                qr_token="QR-DCE-CS042-2026",
                permitted_bus_ids=json.dumps(["bus-07", "bus-04"]),
                permitted_route_ids=json.dumps(["route-07", "route-04"]),
                designated_stop_id="stop-r07-1",
                designated_stop_name="Tambaram West Stand",
                parent_phone="+91 94441 10042",
                is_active=True
            ),
            Student(
                id="DCE-2024-EC018",
                name="Divya Bharathi M",
                department="Electronics & Communication",
                batch="2022-2026",
                rfid_uid="RFID-04D5E6F7",
                qr_token="QR-DCE-EC018-2026",
                permitted_bus_ids=json.dumps(["bus-07"]),
                permitted_route_ids=json.dumps(["route-07"]),
                designated_stop_id="stop-r07-2",
                designated_stop_name="Perungalathur Junction",
                parent_phone="+91 94441 20018",
                is_active=True
            ),
            Student(
                id="DCE-2025-ME009",
                name="Karthik Raja V",
                department="Mechanical Engineering",
                batch="2023-2027",
                rfid_uid="RFID-09B8C7D6",
                qr_token="QR-DCE-ME009-2026",
                permitted_bus_ids=json.dumps(["bus-04"]),
                permitted_route_ids=json.dumps(["route-04"]),
                designated_stop_id="stop-r04-1",
                designated_stop_name="Chromepet MIT Bridge",
                parent_phone="+91 94441 30009",
                is_active=True
            ),
            Student(
                id="DCE-2023-AI055",
                name="Sneha Priya R",
                department="AI & Data Science",
                batch="2021-2025",
                rfid_uid="RFID-11F2E3D4",
                qr_token="QR-DCE-AI055-2026",
                permitted_bus_ids=json.dumps(["bus-07", "bus-12"]),
                permitted_route_ids=json.dumps(["route-07", "route-12"]),
                designated_stop_id="stop-r07-3",
                designated_stop_name="Kishkinta Road Junction",
                parent_phone="+91 94441 40055",
                is_active=True
            ),
            Student(
                id="DCE-2024-IT031",
                name="Vigneshwaran P",
                department="Information Technology",
                batch="2022-2026",
                rfid_uid="RFID-22C3B4A5",
                qr_token="QR-DCE-IT031-2026",
                permitted_bus_ids=json.dumps(["bus-18"]),
                permitted_route_ids=json.dumps(["route-18"]),
                designated_stop_id="stop-r18-1",
                designated_stop_name="Velachery Bypass",
                parent_phone="+91 94441 50031",
                is_active=True
            )
        ]
        for s in sample_students:
            db.add(s)

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

    if db.query(AttendanceRecord).first() is None:
        sample_attendance = [
            AttendanceRecord(
                id="att-seed-001",
                student_id="DCE-2024-CS042",
                student_name="Arun Kumar S",
                department="Computer Science & Engineering",
                bus_id="bus-07",
                bus_number="DCE-BUS-07",
                route_id="route-07",
                stop_id="stop-r07-1",
                stop_name="Tambaram West Stand",
                event_type="BOARDING",
                device_id="pi-bus-07",
                sync_status="REALTIME",
                is_authorized=True,
                remarks="Verified via 13.56MHz RFID Card"
            ),
            AttendanceRecord(
                id="att-seed-002",
                student_id="DCE-2024-EC018",
                student_name="Divya Bharathi M",
                department="Electronics & Communication",
                bus_id="bus-07",
                bus_number="DCE-BUS-07",
                route_id="route-07",
                stop_id="stop-r07-2",
                stop_name="Perungalathur Junction",
                event_type="BOARDING",
                device_id="pi-bus-07",
                sync_status="REALTIME",
                is_authorized=True,
                remarks="Verified via 13.56MHz RFID Card"
            ),
            AttendanceRecord(
                id="att-seed-003",
                student_id="DCE-2025-ME009",
                student_name="Karthik Raja V",
                department="Mechanical Engineering",
                bus_id="bus-04",
                bus_number="DCE-BUS-04",
                route_id="route-04",
                stop_id="stop-r04-1",
                stop_name="Chromepet MIT Bridge",
                event_type="BOARDING",
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
    """Seed SQLite database using existing data from server/db.json if buses table is empty."""
    init_db()
    from .models import User, Bus, Route, Stop, VoiceAnnouncement, IssueReport, BusLatestLocation
    
    # Ensure students, devices, and attendance tables are seeded even if buses already exist
    try:
        seed_hardware_and_attendance_if_empty(db)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed seeding hardware/attendance tables: {e}")

    # Check if database already has buses
    if db.query(Bus).first() is not None:
        return

    db_json_path = PROJECT_ROOT / "server" / "db.json"
    if not db_json_path.exists():
        logger.warning(f"Seed file not found at {db_json_path}")
        return

    try:
        with open(db_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        logger.info("Seeding database from server/db.json...")

        # 1. Seed Admins & Staff Users
        for admin in data.get("admins", []):
            db.add(User(
                id=admin.get("id", "admin-01"),
                name=admin.get("name", "DCE Transport Administrator"),
                email=admin.get("email", "admin@dce.edu"),
                phone="+91 94440 00000",
                role="admin",
                password_hash=admin.get("passwordHash", "admin123"), # Will be checked via auth helper
                is_active=True
            ))

        for staff in data.get("staff", []):
            db.add(User(
                id=staff.get("id"),
                name=staff.get("name"),
                email=staff.get("email"),
                phone=staff.get("phone", ""),
                role=staff.get("role", "driver"),
                password_hash=staff.get("passwordHash", "dce2024"),
                assigned_bus_id=staff.get("assignedBusId"),
                assigned_route_id=staff.get("assignedRouteId"),
                is_active=True
            ))

        # 2. Seed Routes & Stops
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

        # 3. Seed Buses
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

            # Initialize Latest Location Record
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

        # 4. Seed Voice Announcements
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

        # 5. Seed Issue Reports
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
                latitude=float(issue["latitude"]) if issue.get("latitude") else None,
                longitude=float(issue["longitude"]) if issue.get("longitude") else None,
                priority=issue.get("priority", "Medium"),
                status=issue.get("status", "New"),
                admin_remarks=issue.get("adminRemarks", "")
            ))

        db.commit()
        logger.info("Successfully seeded database with Dhanalakshmi College transit data.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to seed database: {e}", exc_info=True)

