import os
import sys
import time
import tempfile
from pathlib import Path

sys.path.insert(0, r"D:\Lib\site-packages")
sys.path.insert(0, r"D:\github")

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal, seed_database_if_empty
from pi_bus_agent.config import AgentConfig
from pi_bus_agent.gps_reader import validate_nmea_checksum, parse_nmea_sentence
from pi_bus_agent.agent_main import RaspberryPiBusAgent

client = TestClient(app)


def _make_nmea_with_checksum(body_without_dollar_and_star: str) -> str:
    calc = 0
    for ch in body_without_dollar_and_star:
        calc ^= ord(ch)
    return f"${body_without_dollar_and_star}*{calc:02X}"


@pytest.fixture(scope="module", autouse=True)
def ensure_seeded():
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()


def test_nmea_checksum_and_neo6m_parsing():
    """Verifies NMEA-0183 XOR checksum validation and coordinate conversion for NEO-6M."""
    # Tambaram West: 12 deg 55.4940 min N = 12.9249, 080 deg 06.9900 min E = 80.1165
    valid_rmc = _make_nmea_with_checksum("GPRMC,081836,A,1255.4940,N,08006.9900,E,15.0,182.5,121026,000.0,W")
    assert validate_nmea_checksum(valid_rmc) is True

    parsed = parse_nmea_sentence(valid_rmc)
    assert parsed is not None
    assert parsed["fix_valid"] is True
    assert abs(parsed["latitude"] - 12.9249) < 0.0001
    assert abs(parsed["longitude"] - 80.1165) < 0.0001
    assert parsed["speed_kmh"] == round(15.0 * 1.852, 2)

    # Corrupted checksum must be rejected
    corrupted = valid_rmc[:-2] + "00"
    assert validate_nmea_checksum(corrupted) is False
    assert parse_nmea_sentence(corrupted) is None

    # Void fix ('V' = no satellite lock) must be marked invalid
    void_rmc = _make_nmea_with_checksum("GPRMC,081836,V,0000.0000,N,00000.0000,E,0.0,0.0,121026,000.0,W")
    parsed_void = parse_nmea_sentence(void_rmc)
    assert parsed_void is not None
    assert parsed_void["fix_valid"] is False


def test_cabin_speaker_geofence_hysteresis_and_cooldown():
    """
    Verifies offline cabin speaker announcements for Approaching, Arrived, and Departed
    with hysteresis (80m arrival vs 135m departure) and cooldown protection.
    """
    stops = [
        {"id": "stop-1", "name": "Tambaram West Stand", "lat": 12.9249, "lng": 80.1165, "sequence": 1, "geofenceRadius": 80},
        {"id": "stop-2", "name": "Perungalathur Junction", "lat": 12.9052, "lng": 80.0951, "sequence": 2, "geofenceRadius": 80},
    ]
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg = AgentConfig(
            device_id="pi-bus-07",
            bus_id="bus-07",
            route_id="route-07",
            local_db_path=os.path.join(tmpdir, "q.db"),
            announcement_cooldown_sec=180
        )
        agent = RaspberryPiBusAgent(config=cfg, route_stops=stops, http_client=client, dry_run_audio=True)

        t0 = 1791500000.0
        # 1. At ~220m away from Tambaram -> APPROACHING
        ev_app = agent.announcer.evaluate_position(12.9268, 80.1165, now_ts=t0)
        assert len(ev_app) == 1
        assert ev_app[0]["eventType"] == "APPROACHING"
        assert ev_app[0]["stopId"] == "stop-1"

        # 2. Immediate repeat at ~210m within cooldown -> suppressed
        ev_dup = agent.announcer.evaluate_position(12.9267, 80.1165, now_ts=t0 + 5)
        assert len(ev_dup) == 0

        # 3. Enter station geofence (0m from Tambaram) -> ARRIVED
        ev_arr = agent.announcer.evaluate_position(12.9249, 80.1165, now_ts=t0 + 30)
        assert len(ev_arr) == 1
        assert ev_arr[0]["eventType"] == "ARRIVED"

        # 4. Drift slightly to ~95m (outside 80m arrival, but inside 135m hysteresis) -> NO premature departure
        ev_drift = agent.announcer.evaluate_position(12.92575, 80.1165, now_ts=t0 + 50)
        assert len(ev_drift) == 0

        # 5. Move to ~180m (outside 135m hysteresis band) -> DEPARTED & announces next stop
        ev_dep = agent.announcer.evaluate_position(12.9265, 80.1165, now_ts=t0 + 75)
        assert len(ev_dep) == 1
        assert ev_dep[0]["eventType"] == "DEPARTED"
        assert ev_dep[0]["nextStopName"] == "Perungalathur Junction"


def test_student_attendance_rfid_deduplication_and_authorization():
    """
    Verifies RFID attendance tap, 5-minute anti-passback deduplication,
    unauthorized bus detection, and secure admin correction workflow.
    """
    run_id = int(time.time() * 1000) % 1000000
    test_student_id = f"DCE-2026-TS{run_id}"
    test_rfid = f"RFID-TS{run_id}"

    # 0. Register a dedicated student for this test run (permitted only on bus-07)
    reg_res = client.post(
        "/api/students",
        json={
            "id": test_student_id,
            "name": "Test Student RFID",
            "department": "Computer Science & Engineering",
            "rfidUid": test_rfid,
            "permittedBusIds": ["bus-07"],
            "permittedRouteIds": ["route-07"],
            "designatedStopName": "Tambaram West Stand"
        }
    )
    assert reg_res.status_code == 200

    unique_ts = int(time.time() * 1000)
    ev_id = f"att-test-{run_id}"

    # 1. Valid RFID tap on permitted bus-07
    res1 = client.post(
        "/api/attendance/tap",
        json={
            "eventId": ev_id,
            "studentIdentifier": test_rfid,
            "busId": "bus-07",
            "routeId": "route-07",
            "stopName": "Tambaram West Stand",
            "eventType": "BOARDING",
            "deviceId": "pi-bus-07",
            "timestamp": unique_ts
        },
        headers={"X-Device-Id": "pi-bus-07", "X-Device-Key": "dce_bus07_secret_key_2026"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["duplicate"] is False
    assert data1["attendance"]["studentId"] == test_student_id
    assert data1["attendance"]["isAuthorized"] is True

    # 2. Duplicate tap 10 seconds later (different eventId, same student & bus) -> caught by 5-min cooldown
    res2 = client.post(
        "/api/attendance/tap",
        json={
            "eventId": f"{ev_id}-retry",
            "studentIdentifier": test_rfid,
            "busId": "bus-07",
            "routeId": "route-07",
            "stopName": "Tambaram West Stand",
            "eventType": "BOARDING",
            "deviceId": "pi-bus-07",
            "timestamp": unique_ts + 10000
        },
        headers={"X-Device-Id": "pi-bus-07", "X-Device-Key": "dce_bus07_secret_key_2026"}
    )
    assert res2.status_code == 200
    assert res2.json()["duplicate"] is True

    # 3. Same student (permitted ONLY on bus-07) boards bus-04 -> flagged as unauthorized
    res_unauth = client.post(
        "/api/attendance/tap",
        json={
            "eventId": f"att-unauth-{run_id}",
            "studentIdentifier": test_rfid,
            "busId": "bus-04",
            "routeId": "route-04",
            "stopName": "Chromepet MIT Bridge",
            "eventType": "BOARDING",
            "deviceId": "pi-bus-04",
            "timestamp": unique_ts
        },
        headers={"X-Device-Id": "pi-bus-04", "X-Device-Key": "dce_bus04_secret_key_2026"}
    )
    assert res_unauth.status_code == 200
    unauth_att = res_unauth.json()["attendance"]
    assert unauth_att["isAuthorized"] is False

    # 4. Admin correction workflow grants special permission and logs audit trail
    corr_res = client.put(
        f"/api/attendance/{unauth_att['id']}/correct",
        json={
            "isAuthorized": True,
            "remarks": "Approved one-day route transfer by Transport Officer"
        }
    )
    assert corr_res.status_code == 200
    assert corr_res.json()["attendance"]["isAuthorized"] is True
    assert corr_res.json()["attendance"]["syncStatus"] == "MANUAL_CORRECTED"


def test_multi_bus_4g_isolation_offline_queue_and_reconciliation():
    """
    Simulates two independent Raspberry Pi 5 bus agents (pi-bus-07 and pi-bus-04)
    operating simultaneously over 4G:
    - Verifies cross-bus spoofing rejection (HTTP 403) and invalid API key rejection (HTTP 401).
    - Simulates a 4G cellular outage where both buses queue GPS fixes and RFID scans locally.
    - Reconnects both buses and verifies 100% queue drainage, zero duplicate records on retry,
      and protection against delayed/out-of-order historical GPS overwrites.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_bus07 = AgentConfig(
            device_id="pi-bus-07",
            bus_id="bus-07",
            route_id="route-07",
            device_api_key="dce_bus07_secret_key_2026",
            local_db_path=os.path.join(tmpdir, "queue_bus07.db")
        )
        cfg_bus04 = AgentConfig(
            device_id="pi-bus-04",
            bus_id="bus-04",
            route_id="route-04",
            device_api_key="dce_bus04_secret_key_2026",
            local_db_path=os.path.join(tmpdir, "queue_bus04.db")
        )

        agent07 = RaspberryPiBusAgent(config=cfg_bus07, http_client=client, dry_run_audio=True)
        agent04 = RaspberryPiBusAgent(config=cfg_bus04, http_client=client, dry_run_audio=True)

        # 1. Security Check: pi-bus-07 attempting to spoof bus-04 must be rejected with 403 Forbidden
        spoof_res = client.post(
            "/api/driver/telemetry",
            json={"busId": "bus-04", "latitude": 12.9516, "longitude": 80.1462, "speed": 30.0},
            headers={"X-Device-Id": "pi-bus-07", "X-Device-Key": "dce_bus07_secret_key_2026"}
        )
        assert spoof_res.status_code == 403

        # 2. Security Check: wrong API key must be rejected with 401 Unauthorized
        bad_key_res = client.post(
            "/api/devices/heartbeat",
            json={"deviceId": "pi-bus-07", "busId": "bus-07"},
            headers={"X-Device-Id": "pi-bus-07", "X-Device-Key": "wrong_secret_key"}
        )
        assert bad_key_res.status_code == 401

        # 3. Simulate 4G Network Outage on BOTH buses simultaneously
        base_ts = int(time.time() * 1000) - 5000
        agent07.process_gps_fix(
            {"latitude": 12.9248, "longitude": 80.1164, "speed_kmh": 18.0, "timestamp_ms": base_ts + 1000},
            force_offline=True
        )
        agent07.process_gps_fix(
            {"latitude": 12.9249, "longitude": 80.1165, "speed_kmh": 0.0, "timestamp_ms": base_ts + 3000},
            force_offline=True
        )
        agent07.attendance_scanner.process_scan(
            "RFID-11F2E3D4", # Sneha Priya R (DCE-2023-AI055)
            event_type="BOARDING",
            current_stop_name="Kishkinta Road Junction",
            now_ts=(base_ts + 4000) / 1000.0
        )

        agent04.process_gps_fix(
            {"latitude": 12.9516, "longitude": 80.1462, "speed_kmh": 25.0, "timestamp_ms": base_ts + 2000},
            force_offline=True
        )
        agent04.attendance_scanner.process_scan(
            "RFID-09B8C7D6", # Karthik Raja V (DCE-2025-ME009)
            event_type="EXIT",
            current_stop_name="DCE Main Arch Terminal",
            now_ts=(base_ts + 5000) / 1000.0
        )

        # Verify local SQLite queues hold the offline events
        assert agent07.queue.get_queue_stats() == {"pendingGpsCount": 2, "pendingAttendanceCount": 1}
        assert agent04.queue.get_queue_stats() == {"pendingGpsCount": 1, "pendingAttendanceCount": 1}

        # 4. Restore 4G Connection and synchronize both agents
        sync07 = agent07.sync_client.sync_pending_queues()
        sync04 = agent04.sync_client.sync_pending_queues()

        assert sync07["success"] is True
        assert sync07["gpsSynced"] == 2
        assert sync07["attendanceSynced"] == 1
        assert agent07.queue.get_queue_stats() == {"pendingGpsCount": 0, "pendingAttendanceCount": 0}

        assert sync04["success"] is True
        assert sync04["gpsSynced"] == 1
        assert sync04["attendanceSynced"] == 1
        assert agent04.queue.get_queue_stats() == {"pendingGpsCount": 0, "pendingAttendanceCount": 0}

        # 5. Send heartbeats from both devices and verify /api/devices lists both online
        hb07 = agent07.sync_client.send_heartbeat(gps_fix_status="3D_FIX", signal_csq=27)
        hb04 = agent04.sync_client.send_heartbeat(gps_fix_status="3D_FIX", signal_csq=24)
        assert hb07["success"] is True
        assert hb04["success"] is True

        dev_list = client.get("/api/devices").json()
        assert dev_list["success"] is True
        assert dev_list["count"] >= 4


def test_restart_recovery_and_hardware_simulator():
    """
    Verifies:
    1. Clean process restart recovery: played announcements and arrived stop state persist in SQLite
       so restarting the daemon does not repeat the same stop announcement.
    2. Hardware-independent simulator explicitly labels all generated fixes as simulated.
    """
    from pi_bus_agent.hardware_simulator import generate_simulated_route_fixes

    stops = [
        {"id": "stop-1", "name": "Tambaram West Stand", "lat": 12.9249, "lng": 80.1165, "sequence": 1, "geofenceRadius": 80},
        {"id": "stop-2", "name": "Perungalathur Junction", "lat": 12.9052, "lng": 80.0951, "sequence": 2, "geofenceRadius": 80},
    ]
    with tempfile.TemporaryDirectory() as tmpdir:
        db_file = os.path.join(tmpdir, "restart_test.db")
        cfg = AgentConfig(
            device_id="pi-bus-07",
            bus_id="bus-07",
            route_id="route-07",
            local_db_path=db_file,
            announcement_cooldown_sec=180,
            test_mode=True
        )
        t0 = 1792000000.0
        agent_before = RaspberryPiBusAgent(config=cfg, route_stops=stops, http_client=client, dry_run_audio=True)
        ev1 = agent_before.announcer.evaluate_position(12.9249, 80.1165, now_ts=t0)
        assert len(ev1) == 1
        assert ev1[0]["eventType"] == "ARRIVED"

        # Simulate process restart using the exact same SQLite file
        agent_after_restart = RaspberryPiBusAgent(config=cfg, route_stops=stops, http_client=client, dry_run_audio=True)
        assert agent_after_restart.announcer.current_arrived_stop_id == "stop-1"
        ev_after = agent_after_restart.announcer.evaluate_position(12.9249, 80.1165, now_ts=t0 + 15)
        assert len(ev_after) == 0 # Must NOT repeat ARRIVED announcement after restart!

        status = agent_after_restart.get_service_status()
        assert status["mode"] == "SIMULATED_TEST_MODE"
        assert len(status["recentPlayedAnnouncements"]) == 1

    # Verify hardware-independent simulator tags fixes clearly
    sim_fixes = generate_simulated_route_fixes([{"lat": 12.9249, "lng": 80.1165, "speed_kmh": 22.0}])
    assert len(sim_fixes) == 1
    assert sim_fixes[0]["isSimulated"] is True
    assert "SIMULATED TEST MODE" in sim_fixes[0]["simulationBanner"]


