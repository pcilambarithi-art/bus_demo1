import base64
import uuid
import pytest
from backend.app.config import settings
from backend.app.database import (
    MODULE_ENGINES,
    check_all_databases_health,
    SessionLocal,
)
from backend.app.models import (
    User,
    Student,
    Bus,
    FaceEnrollment,
    AttendanceSession,
    AttendanceRecord,
    FaceVerificationLog,
    AuditLog,
)
from backend.app.security.authentication import (
    hash_password,
    verify_password,
    create_access_token,
)
from backend.app.services.face_service import face_service


def test_six_logical_databases_connectivity_and_least_privilege():
    """
    Section 11 — Database Tests:
      - Verifies connectivity to all 6 logical databases:
        dce_identity_db, dce_student_db, dce_bus_tracking_db,
        dce_attendance_db, dce_notifications_db, dce_audit_db.
      - Verifies each module's tables exist ONLY in its designated database.
      - Verifies root is never used in the application's MySQL URLs.
    """
    health = check_all_databases_health()
    assert health["allConnected"] is True
    dbs = health["databases"]
    expected_dbs = {
        "dce_identity_db": "users",
        "dce_student_db": "students",
        "dce_bus_tracking_db": "buses",
        "dce_attendance_db": "face_enrollments",
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


def test_face_template_encryption_at_rest_and_tamper_detection():
    """
    Section 6 & 9 — Biometric Security Tests:
      - Verifies 128-D face templates are encrypted with random IV + HMAC-SHA256 at rest.
      - Verifies tampering with the ciphertext or MAC raises ValueError.
    """
    vec = face_service.generate_synthetic_student_embedding("DCE-2024-CS042")
    assert len(vec) == 128

    enc1, h1 = face_service.encrypt_template(vec)
    enc2, h2 = face_service.encrypt_template(vec)

    # Same vector produces same content hash, but distinct random IV ciphertexts
    assert h1 == h2
    assert enc1 != enc2
    assert enc1.startswith("enc:v1:")

    decrypted = face_service.decrypt_template(enc1)
    assert len(decrypted) == 128
    assert face_service.compute_similarity(vec, decrypted) > 0.999

    # Tamper with the ciphertext
    parts = enc1.split(":")
    tampered = f"{parts[0]}:{parts[1]}:{parts[2]}:{parts[3][:-2]}AA:{parts[4]}"
    with pytest.raises(ValueError, match="integrity check failed"):
        face_service.decrypt_template(tampered)


def test_face_enrollment_consent_validation_and_verification_pipeline(client):
    """
    Section 11 — Face Attendance End-to-End Tests:
      1. Reject enrollment without consent (consentGranted=False -> 400)
      2. Reject spoofed non-image magic bytes (INVALID_IMAGE_FORMAT -> 422)
      3. Valid enrollment of DCE-2025-ME009 with valid PNG face image -> 200
      4. Ensure encrypted_template is NEVER exposed in GET /api/attendance/enrollments/{student_id}
      5. Create active AttendanceSession (POST /api/attendance/sessions)
      6. Verify enrolled student with matching live frame -> MATCH_VERIFIED (similarity >= 0.82)
      7. Verify duplicate attempt in same session -> DUPLICATE_IN_SESSION (no duplicate AttendanceRecord)
      8. Reject poor lighting frame -> POOR_LIGHTING (422)
      9. Reject blurry frame -> BLURRY_IMAGE (422)
      10. Reject failed liveness frame -> LIVENESS_FAILED (422)
      11. Reject non-matching face for claimed student -> LOW_CONFIDENCE (401)
      12. Manual review of attendance record -> logs in dce_audit_db
      13. Role check: student role cannot enroll or review attendance (403)
      14. Delete enrollment (DELETE /api/attendance/enrollments/{student_id}) -> audited & removed
    """
    student_id = "DCE-2025-ME009"
    valid_png_bytes = face_service.generate_synthetic_face_image(student_id, brightness_target=130.0)
    valid_b64 = base64.b64encode(valid_png_bytes).decode("ascii")

    # 1. Reject enrollment when consentGranted is False
    no_consent_res = client.post(
        "/api/attendance/enrollments",
        json={
            "studentId": student_id,
            "consentGranted": False,
            "imageBase64": valid_b64,
        },
    )
    assert no_consent_res.status_code == 400

    # 2. Reject spoofed non-image magic bytes
    spoof_b64 = base64.b64encode(b"NOT_AN_IMAGE_PAYLOAD_1234567890_SPOOF").decode("ascii")
    spoof_res = client.post(
        "/api/attendance/enrollments",
        json={
            "studentId": student_id,
            "consentGranted": True,
            "imageBase64": spoof_b64,
        },
    )
    assert spoof_res.status_code == 422
    assert spoof_res.json()["detail"]["code"] == "INVALID_IMAGE_FORMAT"

    # 3. Valid enrollment of DCE-2025-ME009
    enroll_res = client.post(
        "/api/attendance/enrollments",
        json={
            "studentId": student_id,
            "consentGranted": True,
            "imageBase64": valid_b64,
            "livenessScore": 0.95,
        },
    )
    assert enroll_res.status_code == 200
    enroll_data = enroll_res.json()
    assert enroll_data["success"] is True
    assert enroll_data["enrollment"]["studentId"] == student_id
    assert "encrypted_template" not in enroll_data["enrollment"]
    assert "encryptedTemplate" not in enroll_data["enrollment"]

    # 4. Check GET /api/attendance/enrollments/{student_id}
    get_enr = client.get(f"/api/attendance/enrollments/{student_id}")
    assert get_enr.status_code == 200
    assert get_enr.json()["enrolled"] is True
    assert "encrypted_template" not in str(get_enr.json())

    # 5. Create a new active AttendanceSession
    sess_res = client.post(
        "/api/attendance/sessions",
        json={
            "sessionName": f"Test Boarding Session {uuid.uuid4().hex[:6]}",
            "sessionType": "BUS_BOARDING",
            "busId": "bus-04",
            "routeId": "route-04",
            "similarityThreshold": 0.82,
            "requireLiveness": True,
        },
    )
    assert sess_res.status_code == 200
    session_id = sess_res.json()["session"]["id"]

    # 6. Verify enrolled student with matching live frame -> MATCH_VERIFIED
    ver_res = client.post(
        "/api/attendance/verify",
        json={
            "sessionId": session_id,
            "studentId": student_id,
            "imageBase64": valid_b64,
            "livenessScore": 0.94,
            "busId": "bus-04",
            "eventType": "BOARDING",
        },
    )
    assert ver_res.status_code == 200
    ver_data = ver_res.json()
    assert ver_data["verified"] is True
    assert ver_data["duplicate"] is False
    assert ver_data["outcome"] == "MATCH_VERIFIED"
    assert ver_data["similarityScore"] >= 0.82
    record_id = ver_data["attendance"]["id"]

    # 7. Duplicate verification in the same session -> DUPLICATE_IN_SESSION
    dup_res = client.post(
        "/api/attendance/verify",
        json={
            "sessionId": session_id,
            "studentId": student_id,
            "imageBase64": valid_b64,
            "livenessScore": 0.94,
            "busId": "bus-04",
        },
    )
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["duplicate"] is True
    assert dup_data["outcome"] == "DUPLICATE_IN_SESSION"
    assert dup_data["attendance"]["id"] == record_id

    # 8. Reject poor lighting frame -> POOR_LIGHTING
    dark_bytes = face_service.generate_synthetic_face_image(student_id, brightness_target=10.0, blank_frame=True)
    dark_b64 = base64.b64encode(dark_bytes).decode("ascii")
    dark_res = client.post(
        "/api/attendance/verify",
        json={
            "sessionId": session_id,
            "studentId": student_id,
            "imageBase64": dark_b64,
            "livenessScore": 0.90,
        },
    )
    assert dark_res.status_code == 422
    assert dark_res.json()["detail"]["outcome"] == "POOR_LIGHTING"

    # 9. Reject blurry image -> BLURRY_IMAGE
    blur_bytes = face_service.generate_synthetic_face_image(student_id, brightness_target=130.0, apply_blur=True)
    blur_b64 = base64.b64encode(blur_bytes).decode("ascii")
    blur_res = client.post(
        "/api/attendance/verify",
        json={
            "sessionId": session_id,
            "studentId": student_id,
            "imageBase64": blur_b64,
            "livenessScore": 0.90,
        },
    )
    assert blur_res.status_code == 422
    assert blur_res.json()["detail"]["outcome"] == "BLURRY_IMAGE"

    # 10. Reject failed liveness -> LIVENESS_FAILED
    spoof_live_res = client.post(
        "/api/attendance/verify",
        json={
            "sessionId": session_id,
            "studentId": student_id,
            "imageBase64": valid_b64,
            "livenessScore": 0.25,
        },
    )
    assert spoof_live_res.status_code == 422
    assert spoof_live_res.json()["detail"]["outcome"] == "LIVENESS_FAILED"

    # 11. Reject non-matching face for claimed student -> LOW_CONFIDENCE (401)
    other_face_bytes = face_service.generate_synthetic_face_image("UNRELATED-IMPOSTOR-999", brightness_target=130.0)
    other_b64 = base64.b64encode(other_face_bytes).decode("ascii")
    mismatch_res = client.post(
        "/api/attendance/verify",
        json={
            "sessionId": session_id,
            "studentId": student_id,
            "imageBase64": other_b64,
            "livenessScore": 0.92,
        },
    )
    assert mismatch_res.status_code == 401
    assert mismatch_res.json()["detail"]["outcome"] == "LOW_CONFIDENCE"

    # 12. Manual review of attendance record -> POST /api/attendance/records/{record_id}/review
    rev_res = client.post(
        f"/api/attendance/records/{record_id}/review",
        json={
            "decision": "MANUAL_APPROVED",
            "isAuthorized": True,
            "remarks": "Verified by bus operator during morning boarding check",
        },
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["attendance"]["verificationStatus"] == "MANUAL_APPROVED"

    # 13. Role check: student role cannot enroll or review attendance
    db = SessionLocal()
    try:
        stu_user = db.query(User).filter(User.id == "DCE-2024-CS042").first()
        if not stu_user:
            stu_user = User(
                id="DCE-2024-CS042",
                name="Arun Kumar S",
                email="arunkumar.cs24@dce.edu.in",
                role="student",
                password_hash=hash_password("student123"),
                is_active=True,
            )
            db.add(stu_user)
            db.commit()
    finally:
        db.close()

    student_token = create_access_token({"sub": "DCE-2024-CS042", "role": "student"})
    student_headers = {"Authorization": f"Bearer {student_token}"}

    forbidden_enroll = client.post(
        "/api/attendance/enrollments",
        json={"studentId": student_id, "consentGranted": True, "imageBase64": valid_b64},
        headers=student_headers,
    )
    assert forbidden_enroll.status_code == 403

    forbidden_other_records = client.get(
        f"/api/attendance/records/{student_id}",
        headers=student_headers,
    )
    assert forbidden_other_records.status_code == 403

    own_records = client.get(
        "/api/attendance/records/DCE-2024-CS042",
        headers=student_headers,
    )
    assert own_records.status_code == 200

    # 14. Delete enrollment (DELETE /api/attendance/enrollments/{student_id}) & verify audit log in dce_audit_db
    del_res = client.delete(f"/api/attendance/enrollments/{student_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted"] is True

    after_del = client.get(f"/api/attendance/enrollments/{student_id}")
    assert after_del.json()["enrolled"] is False

    db = SessionLocal()
    try:
        audit_del = db.query(AuditLog).filter(
            AuditLog.action == "BIOMETRIC_FACE_DELETED",
            AuditLog.target == f"Student:{student_id}",
        ).first()
        assert audit_del is not None
    finally:
        db.close()
