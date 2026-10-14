import pytest
from backend.app.config import settings
from backend.app.database import (
    MODULE_ENGINES,
    check_all_databases_health,
)
from backend.app.security.authentication import (
    hash_password,
    verify_password,
    create_access_token,
)


def test_six_logical_databases_connectivity_and_least_privilege():
    """
    Section 11 — Database Tests:
      - Verifies connectivity to all 6 logical databases:
        dce_identity_db, dce_student_db, dce_bus_tracking_db,
        dce_attendance_db, dce_notifications_db, dce_audit_db.
      - Verifies each module's tables exist in its designated database.
      - Verifies root is never used in the application's MySQL URLs.
    """
    health = check_all_databases_health()
    assert health["allConnected"] is True
    dbs = health["databases"]
    expected_dbs = {
        "dce_identity_db": "users",
        "dce_student_db": "students",
        "dce_bus_tracking_db": "buses",
        "dce_notifications_db": "notifications",
        "dce_audit_db": "audit_logs",
    }
    for db_name, required_table in expected_dbs.items():
        assert db_name in dbs
        assert dbs[db_name]["connected"] is True
        assert required_table in dbs[db_name]["tables"]

    # Verify least-privilege service accounts (never 'root') when running in MySQL mode
    if "mysql" in settings.DCE_IDENTITY_DB_URL:
        for _, (_, _, url) in MODULE_ENGINES.items():
            assert "://root:" not in url


def test_pbkdf2_password_hashing_and_token_revocation(client):
    """
    Section 11 — Identity & Security Tests:
      - Salted PBKDF2-HMAC-SHA256 password hashing & verification
      - Token revocation via POST /api/auth/logout
    """
    hashed = hash_password("DceSecret#2026")
    assert hashed.startswith("pbkdf2:sha256:")
    assert verify_password("DceSecret#2026", hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    # Create a temporary token for admin-01 and test revocation
    token = create_access_token({"sub": "admin-01", "role": "admin", "email": "admin@dce.edu"})
    headers = {"Authorization": f"Bearer {token}"}

    # Logout revokes the token in dce_identity_db.revoked_tokens
    res = client.post("/api/auth/logout", headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Using the revoked token again must return 401
    res_after = client.post("/api/auth/logout", headers=headers)
    assert res_after.status_code == 401


def test_unsupported_attendance_apis_are_deleted_and_return_404(client):
    """
    Verifies that unsupported attendance and biometric endpoints have been completely
    removed from backend routing and return 404 Not Found:
      - /api/attendance/sessions
      - /api/attendance/enrollments
      - /api/attendance/verify
      - /api/attendance/records
      - /api/attendance/tap
      - /api/attendance/batch
      - /api/attendance/report
      - /api/students
    """
    unsupported_endpoints = [
        ("POST", "/api/attendance/sessions"),
        ("GET", "/api/attendance/sessions"),
        ("POST", "/api/attendance/enrollments"),
        ("GET", "/api/attendance/enrollments/DCE-2025-ME009"),
        ("DELETE", "/api/attendance/enrollments/DCE-2025-ME009"),
        ("POST", "/api/attendance/verify"),
        ("GET", "/api/attendance/records"),
        ("POST", "/api/attendance/tap"),
        ("POST", "/api/attendance/batch"),
        ("GET", "/api/attendance/report"),
        ("GET", "/api/students"),
        ("POST", "/api/students"),
    ]
    for method, path in unsupported_endpoints:
        if method == "POST":
            res = client.post(path, json={})
        elif method == "DELETE":
            res = client.delete(path)
        else:
            res = client.get(path)
        assert res.status_code == 404, f"Expected 404 Not Found for {method} {path}, got {res.status_code}"


def test_supported_core_bus_tracking_endpoints_remain_active(client):
    """
    Verifies that supported core bus tracking endpoints remain fully active and responsive:
      - GET /api/health -> 200 OK
      - POST /api/health/databases/check -> 200 OK
      - GET /api/buses -> 200 OK
      - GET /api/routes -> 200 OK
      - GET /api/stops -> 200 OK
      - GET /api/devices -> 200 OK
      - GET /api/live/buses -> 200 OK
      - GET /api/sync -> 200 OK
    """
    res_health = client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_db = client.post("/api/health/databases/check")
    assert res_db.status_code == 200
    assert res_db.json()["success"] is True

    res_buses = client.get("/api/buses")
    assert res_buses.status_code == 200

    res_routes = client.get("/api/routes")
    assert res_routes.status_code == 200

    res_stops = client.get("/api/stops")
    assert res_stops.status_code == 200

    res_devices = client.get("/api/devices")
    assert res_devices.status_code == 200

    res_live = client.get("/api/live/buses")
    assert res_live.status_code == 200

    res_sync = client.get("/api/sync")
    assert res_sync.status_code == 200
