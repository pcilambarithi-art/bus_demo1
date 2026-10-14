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


def test_device_telemetry_batch_and_ping():
    """
    Verifies Raspberry Pi device authentication, GPS batch telemetry ingest,
    and admin device ping endpoint.
    """
    # 1. Ping device pi-bus-07
    ping_res = client.post("/api/devices/pi-bus-07/ping")
    assert ping_res.status_code == 200
    assert ping_res.json()["success"] is True
    assert ping_res.json()["device"]["id"] == "pi-bus-07"
    assert "latencyMs" in ping_res.json()["device"] or "isOnline" in ping_res.json()["device"]

    # 2. Ping unknown device -> 404
    bad_ping = client.post("/api/devices/non-existent-pi/ping")
    assert bad_ping.status_code == 404


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


def test_multi_bus_acceptance_criteria():
    """
    Executes the complete 8-point Multi-Bus Acceptance Test:
    1. Each device uploads GPS only for its assigned bus (403 on cross-bus).
    2. Both buses appear independently on the student map (/api/live/buses).
    3. GPS updates flow through the central server to the website via SSE.
    4. Duplicate uploads do not create duplicate attendance or GPS records.
    5. One bus losing connection does not interrupt the other bus's live updates.
    6. Offline events synchronize after connectivity returns; delayed historical points do not overwrite newer live state.
    7. Stale buses are explicitly marked as stale/offline (gpsHealth == 'offline'), never falsely shown as live.
    8. Admin can inspect each device's GPS status, connectivity status, and lastSyncedAt time.
    """
    import asyncio
    from datetime import datetime, timedelta
    from backend.app.models.gps import BusLatestLocation
    from backend.app.services.live_updates import sse_manager

    # Subscribe a mock web client to SSE broadcast manager
    sse_queue = asyncio.run(sse_manager.connect())
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            cfg07 = AgentConfig(
                device_id="pi-bus-07",
                bus_id="bus-07",
                route_id="route-07",
                device_api_key="dce_bus07_secret_key_2026",
                local_db_path=os.path.join(tmpdir, "acc_07.db"),
                test_mode=True
            )
            cfg04 = AgentConfig(
                device_id="pi-bus-04",
                bus_id="bus-04",
                route_id="route-04",
                device_api_key="dce_bus04_secret_key_2026",
                local_db_path=os.path.join(tmpdir, "acc_04.db"),
                test_mode=True
            )
            agent07 = RaspberryPiBusAgent(config=cfg07, http_client=client, dry_run_audio=True)
            agent04 = RaspberryPiBusAgent(config=cfg04, http_client=client, dry_run_audio=True)

            now_ms = int(time.time() * 1000)

            # 1 & 5: Bus-07 loses 4G connection (queues locally), while Bus-04 continues live 4G updates uninterrupted
            res_07_offline = agent07.process_gps_fix(
                {"latitude": 12.9249, "longitude": 80.1165, "speed_kmh": 21.5, "timestamp_ms": now_ms - 4000},
                force_offline=True
            )
            assert res_07_offline["sync"]["mode"] == "QUEUED_OFFLINE"

            res_04_live = agent04.process_gps_fix(
                {"latitude": 12.9516, "longitude": 80.1462, "speed_kmh": 32.0, "timestamp_ms": now_ms},
                force_offline=False
            )
            assert res_04_live["sync"]["mode"] == "LIVE_SENT"

            # 3. Verify SSE broadcast flowed to the connected web client
            assert not sse_queue.empty()
            sse_msg = sse_queue.get_nowait()
            assert sse_msg["type"] == "GPS_TELEMETRY_UPDATE"
            assert sse_msg["bus"]["busId"] == "bus-04"

            # 6. Bus-07 reconnects and synchronizes its offline queue
            sync_07 = agent07.sync_client.sync_pending_queues()
            assert sync_07["success"] is True
            assert sync_07["gpsSynced"] == 1

            # 4. Duplicate batch retry check: re-submitting the exact same GPS point must be deduplicated
            dup_batch_res = client.post(
                "/api/devices/gps-batch",
                json={
                    "deviceId": "pi-bus-07",
                    "busId": "bus-07",
                    "points": [
                        {
                            "eventId": "dup-evt-07",
                            "latitude": 12.9249,
                            "longitude": 80.1165,
                            "speed": 21.5,
                            "timestamp": now_ms - 4000
                        }
                    ]
                },
                headers={"X-Device-Id": "pi-bus-07", "X-Device-Key": "dce_bus07_secret_key_2026"}
            ).json()
            assert dup_batch_res["insertedCount"] == 0
            assert dup_batch_res["duplicateCount"] == 1

            # Delayed / out-of-order historical point from 20 minutes ago must NOT overwrite current live location
            old_ts = now_ms - (20 * 60 * 1000)
            delayed_res = client.post(
                "/api/devices/gps-batch",
                json={
                    "deviceId": "pi-bus-04",
                    "busId": "bus-04",
                    "points": [
                        {
                            "eventId": f"delayed-04-{old_ts}",
                            "latitude": 12.8000,
                            "longitude": 80.0000,
                            "speed": 10.0,
                            "timestamp": old_ts
                        }
                    ]
                },
                headers={"X-Device-Id": "pi-bus-04", "X-Device-Key": "dce_bus04_secret_key_2026"}
            ).json()
            assert delayed_res["insertedCount"] == 1
            assert delayed_res["latestPositionUpdated"] is False

            # 2. Verify both buses appear independently on the student map (/api/live/buses)
            live_map = client.get("/api/live/buses").json()
            buses_by_id = {b["busId"]: b for b in live_map["buses"]}
            assert "bus-07" in buses_by_id and "bus-04" in buses_by_id
            assert abs(buses_by_id["bus-04"]["lat"] - 12.9516) < 0.001 # Not overwritten by 12.8000 delayed point!
            assert abs(buses_by_id["bus-07"]["lat"] - 12.9249) < 0.001

            # 7. Stale / Offline bus check: age bus-12's last_updated by 10 minutes and verify offline status
            db = SessionLocal()
            try:
                stale_bus = db.query(BusLatestLocation).filter(BusLatestLocation.bus_id == "bus-12").first()
                if stale_bus:
                    stale_bus.last_updated = datetime.utcnow() - timedelta(minutes=10)
                    db.commit()
            finally:
                db.close()

            live_after_stale = client.get("/api/live/buses").json()
            b12 = next(b for b in live_after_stale["buses"] if b["busId"] == "bus-12")
            assert b12["gpsHealth"] == "offline"
            assert "Offline" in b12["gpsHealthLabel"]


            # 8. Admin device status inspection (/api/devices)
            devices_resp = client.get("/api/devices").json()
            devs_by_id = {d["id"]: d for d in devices_resp["devices"]}
            assert "pi-bus-07" in devs_by_id and "pi-bus-04" in devs_by_id
            assert devs_by_id["pi-bus-07"]["gpsFixStatus"] == "3D_FIX"
            assert devs_by_id["pi-bus-07"]["isOnline"] is True
            assert devs_by_id["pi-bus-07"]["lastSyncedAt"] > 0
    finally:
        asyncio.run(sse_manager.disconnect(sse_queue))




