# Dhanalakshmi College of Engineering — Bus Tracking, Face Biometric Attendance & 6-MySQL Database Architecture

## 1. Architecture Overview

The **Dhanalakshmi College of Engineering (DCE) Bus Tracking & Face Attendance System** combines:
- **FastAPI Backend (`backend/app/`)**: Serves REST APIs, Server-Sent Events (SSE) real-time fleet & attendance streams (`/api/live/stream`), biometric face template encryption/verification, and Raspberry Pi 5 4G LTE hardware synchronization.
- **Six Logical MySQL 8.x Databases (`SQLAlchemy 2.x` + `PyMySQL` + `Alembic`)**: Strict module isolation using dedicated least-privilege MySQL service accounts per module.
- **Face-Based Biometric Attendance (`backend/app/services/face_service.py`)**: Explicit student consent enforcement, image magic-byte & quality validation (brightness, Laplacian blur/sharpness, facial presence), liveness detection, 128-D normalized feature vector extraction, and Encrypt-then-MAC (`HMAC-SHA256`) template encryption at rest.
- **Raspberry Pi 5 4G Bus Agent (`pi_bus_agent/`)**: NEO-6M NMEA-0183 hardware parser, local cabin speaker announcement hysteresis engine, RFID/QR fallback reader, and offline SQLite store-and-forward queue.
- **React 19 + TypeScript + Capacitor Android Frontend (`src/`)**: Student/Parent Portal, Driver Console, and Transport Administrator Dashboard (`AttendanceTab.tsx`).

---

## 2. Six-Database MySQL 8.x Structure & Table List

Each module connects via its own restricted MySQL 8.x user (`dce_*_user`) and SQLAlchemy declarative base (`MultiDatabaseRoutingSession` in `backend/app/database.py`). The application **never** uses the MySQL `root` account at runtime.

| Logical Database | MySQL User | Declarative Base | Tables |
| :--- | :--- | :--- | :--- |
| **`dce_identity_db`** | `dce_identity_user` | `IdentityBase` | `users`, `revoked_tokens`, `auth_login_events` |
| **`dce_student_db`** | `dce_student_user` | `StudentBase` | `students` |
| **`dce_bus_tracking_db`** | `dce_tracking_user` | `TrackingBase` | `buses`, `routes`, `stops`, `trips`, `gps_history`, `bus_latest_location`, `arrival_departure_events`, `devices` |
| **`dce_attendance_db`** | `dce_attendance_user` | `AttendanceBase` | `face_enrollments`, `attendance_sessions`, `attendance_records`, `face_verification_logs` |
| **`dce_notifications_db`** | `dce_notif_user` | `NotificationBase` | `notifications`, `notification_preferences`, `voice_announcements`, `issue_reports` |
| **`dce_audit_db`** | `dce_audit_user` | `AuditBase` | `audit_logs` |

---

## 3. Windows 11 Local Setup & MySQL 8.x Provisioning Guide

### Prerequisites
- Windows 11 with **MySQL Server 8.0+** (`MySQL80` Windows Service running on `127.0.0.1:3306`)
- Python 3.11+ (`D:\python.exe`) with `fastapi`, `sqlalchemy>=2.0`, `pymysql`, `alembic`, `pillow`, `numpy`
- Node.js 20+ for React/Vite frontend build

### Step 1: Provision the 6 MySQL Databases and Restricted Users
Review and run [`backend/sql/01_create_mysql_databases_and_users.sql`](file:///D:/github/backend/sql/01_create_mysql_databases_and_users.sql) as a MySQL administrator:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < backend\sql\01_create_mysql_databases_and_users.sql
```

### Step 2: Configure `.env`
Copy `.env.example` to `.env` (which is gitignored) and configure the 6 least-privilege connection URLs and encryption keys:
```ini
DCE_DB_MODE=mysql
DCE_IDENTITY_DB_URL=mysql+pymysql://dce_identity_user:<PASSWORD>@127.0.0.1:3306/dce_identity_db?charset=utf8mb4
DCE_STUDENT_DB_URL=mysql+pymysql://dce_student_user:<PASSWORD>@127.0.0.1:3306/dce_student_db?charset=utf8mb4
DCE_TRACKING_DB_URL=mysql+pymysql://dce_tracking_user:<PASSWORD>@127.0.0.1:3306/dce_bus_tracking_db?charset=utf8mb4
DCE_ATTENDANCE_DB_URL=mysql+pymysql://dce_attendance_user:<PASSWORD>@127.0.0.1:3306/dce_attendance_db?charset=utf8mb4
DCE_NOTIFICATIONS_DB_URL=mysql+pymysql://dce_notif_user:<PASSWORD>@127.0.0.1:3306/dce_notifications_db?charset=utf8mb4
DCE_AUDIT_DB_URL=mysql+pymysql://dce_audit_user:<PASSWORD>@127.0.0.1:3306/dce_audit_db?charset=utf8mb4
```

---

## 4. Backup, Restore & Alembic Migration Guide

### Creating & Verifying Backups Before Migrations
Always create and verify a full backup before running schema migrations:
```powershell
# Backup all 6 MySQL databases + SQLite snapshot into backend/data/backups/
powershell -ExecutionPolicy Bypass -File backend\sql\backup_and_restore_mysql.ps1 -Action backup

# Verify backup files and byte sizes
powershell -ExecutionPolicy Bypass -File backend\sql\backup_and_restore_mysql.ps1 -Action verify

# Restore from a timestamped backup if needed
powershell -ExecutionPolicy Bypass -File backend\sql\backup_and_restore_mysql.ps1 -Action restore -BackupFile backend\data\backups\dce_mysql_6db_backup_YYYY_MM_DD_HHMMSS.sql.bak
```

### Running Alembic Migrations Across All 6 Databases
```powershell
$env:PYTHONPATH="D:\Lib\site-packages;D:\github"
D:\python.exe -m alembic -c backend/alembic.ini upgrade head
```

---

## 5. Face Attendance Enrollment, Verification & Biometric Retention Policy

### Biometric Privacy, Retention & Deletion Policy
1. **Explicit Informed Consent**: `POST /api/attendance/enrollments` requires `consentGranted: true` and records the consent statement and UTC timestamp in `dce_attendance_db.face_enrollments`.
2. **No Public or Plaintext Face Storage**:
   - Raw camera frames are validated and processed strictly in volatile RAM and discarded immediately after 128-D feature extraction.
   - Only the encrypted 128-D feature template (`enc:v1:<iv_hex>:<ciphertext_b64>:<hmac_sha256>`) is stored in `dce_attendance_db`.
   - API responses never include `encrypted_template` or raw embeddings.
3. **Right to Erasure / Deletion**:
   - Administrators can revoke and permanently delete any student's biometric template at any time via `DELETE /api/attendance/enrollments/{student_id}` or the **Revoke** button in the Admin Dashboard.
   - Every enrollment and deletion writes an immutable record to `dce_audit_db.audit_logs` (`BIOMETRIC_FACE_ENROLLED`, `BIOMETRIC_FACE_DELETED`).

### Quality & Anti-Spoofing Gates
- **Magic-Byte Validation**: Accepts only genuine PNG (`\x89PNG`), JPEG (`\xff\xd8\xff`), or WEBP (`RIFF...WEBP`) payloads under 5 MB.
- **Lighting Gate**: Rejects frames with mean luminance `< 35.0` (too dark) or `> 235.0` (glare/overexposed) with `POOR_LIGHTING`.
- **Blur / Sharpness Gate**: Rejects frames with spatial gradient variance `< 12.0` with `BLURRY_IMAGE`.
- **Liveness Gate**: Rejects static photo or low-liveness frames (`< 0.65`) with `LIVENESS_FAILED`.
- **Similarity Threshold**: Requires cosine similarity `>= 0.82` (configurable per session) to record `MATCH_VERIFIED`.

---

## 6. API Reference

### Face & RFID/QR Attendance Endpoints
- `POST /api/attendance/sessions` — Open a `BUS_BOARDING`, `CLASSROOM`, or `EXAM_HALL` attendance session.
- `GET /api/attendance/sessions` — List active and past attendance sessions.
- `POST /api/attendance/sessions/{session_id}/close` — Close an active attendance session.
- `POST /api/attendance/enrollments` — Enroll student face template (requires operator/admin role + `consentGranted: true`).
- `GET /api/attendance/enrollments` — List enrollment metadata records.
- `GET /api/attendance/enrollments/{student_id}` — Get enrollment status for a specific student.
- `DELETE /api/attendance/enrollments/{student_id}` — Permanently delete a student's encrypted biometric template.
- `POST /api/attendance/verify` — Verify live camera frame against an active session with liveness and duplicate prevention.
- `GET /api/attendance/records` — List attendance records with filters (`sessionId`, `busId`, `studentId`, `verificationMethod`).
- `GET /api/attendance/records/{student_id}` — Get attendance history for a student (RBAC enforced).
- `POST /api/attendance/records/{record_id}/review` — Manually approve/reject/flag an attendance record with mandatory audit remarks.
- `POST /api/attendance/tap` — Real-time RFID/QR fallback scan.
- `POST /api/attendance/batch` — Synchronize offline queued attendance records from Raspberry Pi 5 bus agents.

### Authentication, GPS & Fleet Endpoints
- `POST /api/admin/login`, `POST /api/staff/login`, `POST /api/auth/logout`
- `GET /api/health`, `GET /api/sync`
- `POST /api/driver/telemetry`, `GET /api/live/buses`, `GET /api/live/stream` (SSE)
- `POST /api/devices/heartbeat`, `POST /api/devices/gps-batch`, `GET /api/devices`

---

## 7. Security Checklist

- [x] **Least-Privilege Database Accounts**: 6 isolated MySQL users (`dce_identity_user`, `dce_student_user`, `dce_tracking_user`, `dce_attendance_user`, `dce_notif_user`, `dce_audit_user`); `root` is never used by the application.
- [x] **Salted PBKDF2-HMAC-SHA256 Passwords**: 600,000 iterations with 16-byte cryptographic random salt (`pbkdf2:sha256:600000$...`).
- [x] **JWT Token Revocation & Brute-Force Lockout**: `revoked_tokens` and `auth_login_events` tables in `dce_identity_db`.
- [x] **Biometric Encryption at Rest**: 128-D facial feature templates encrypted with random IV + Encrypt-then-MAC (`HMAC-SHA256`).
- [x] **Device-to-Bus Binding**: Raspberry Pi 5 agents (`X-Device-Id` / `X-Device-Key`) strictly restricted to their assigned `bus_id`.
- [x] **Zero Secrets in Git**: `.env`, `*.db`, and `backend/data/backups/*` excluded in `.gitignore`.
