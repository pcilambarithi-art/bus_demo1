-- ============================================================================
-- DHANALAKSHMI COLLEGE OF ENGINEERING (DCE) BUS TRACKING & FACE ATTENDANCE
-- MySQL 8.x Six-Database Architecture & Principle-of-Least-Privilege Users
-- ============================================================================
-- IMPORTANT:
-- 1. Execute this script once as a MySQL administrative user to provision the
--    six logical databases and six restricted service accounts.
-- 2. Replace the placeholder passwords below with strong secrets stored ONLY
--    in your environment (.env), never committed to source control.
-- 3. The FastAPI application NEVER connects using the MySQL 'root' account.
-- ============================================================================

-- 1. Create the 6 Logical Databases (UTF-8 Unicode)
CREATE DATABASE IF NOT EXISTS `dce_identity_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `dce_student_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `dce_bus_tracking_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `dce_attendance_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `dce_notifications_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `dce_audit_db`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Create Dedicated Restricted Service Accounts (Least Privilege for localhost & 127.0.0.1)
CREATE USER IF NOT EXISTS 'dce_identity_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_IDENTITY_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'dce_identity_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_IDENTITY_DB_PASSWORD';

CREATE USER IF NOT EXISTS 'dce_student_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_STUDENT_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'dce_student_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_STUDENT_DB_PASSWORD';

CREATE USER IF NOT EXISTS 'dce_tracking_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_TRACKING_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'dce_tracking_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_TRACKING_DB_PASSWORD';

CREATE USER IF NOT EXISTS 'dce_attendance_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_ATTENDANCE_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'dce_attendance_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_ATTENDANCE_DB_PASSWORD';

CREATE USER IF NOT EXISTS 'dce_notif_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_NOTIF_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'dce_notif_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_NOTIF_DB_PASSWORD';

CREATE USER IF NOT EXISTS 'dce_audit_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_AUDIT_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'dce_audit_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_AUDIT_DB_PASSWORD';

-- 3. Grant Strictly Scoped Permissions Per Module Database
-- Identity Module: isolated to dce_identity_db
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_identity_db`.* TO 'dce_identity_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_identity_db`.* TO 'dce_identity_user'@'127.0.0.1';

-- Student Profile Module: isolated to dce_student_db
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_student_db`.* TO 'dce_student_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_student_db`.* TO 'dce_student_user'@'127.0.0.1';

-- Bus GPS Tracking Module: isolated to dce_bus_tracking_db
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_bus_tracking_db`.* TO 'dce_tracking_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_bus_tracking_db`.* TO 'dce_tracking_user'@'127.0.0.1';

-- Face Attendance & Biometrics Module: isolated to dce_attendance_db
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_attendance_db`.* TO 'dce_attendance_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_attendance_db`.* TO 'dce_attendance_user'@'127.0.0.1';

-- Notifications Module: isolated to dce_notifications_db
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_notifications_db`.* TO 'dce_notif_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES ON `dce_notifications_db`.* TO 'dce_notif_user'@'127.0.0.1';

-- Security Audit Module: isolated to dce_audit_db (Append/Read — no DELETE of audit logs in normal runtime)
GRANT SELECT, INSERT, CREATE, INDEX, ALTER, REFERENCES ON `dce_audit_db`.* TO 'dce_audit_user'@'localhost';
GRANT SELECT, INSERT, CREATE, INDEX, ALTER, REFERENCES ON `dce_audit_db`.* TO 'dce_audit_user'@'127.0.0.1';

FLUSH PRIVILEGES;
