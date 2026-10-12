# Dhanalakshmi College of Engineering (DCE) — Bus Tracking FastAPI Backend

Enterprise-grade, modular Python FastAPI backend with SQLite persistence, real-time GPS telemetry ingestion, 4-phase station geofencing, and Server-Sent Events (SSE) live streaming.

---

## 1. Architecture Overview

```
D:\github\backend\
├── app/
│   ├── main.py              # FastAPI application, lifespan seeder, CORS, SPA fallback
│   ├── config.py            # Centralized settings and environment variables
│   ├── database.py          # SQLAlchemy SQLite connection and automatic data seeder
│   ├── models/              # Relational models: Bus, Route, Stop, GPSHistory, User, etc.
│   ├── schemas/             # Pydantic validation schemas
│   ├── api/                 # Modular endpoints: health, auth, buses, routes, stops, gps, sync, admin
│   ├── services/            # Core business logic: geofencing, ETA, GPS filter, SSE manager
│   └── security/            # Password hashing and role-based permissions
├── data/
│   ├── bus_tracker.db       # Persistent SQLite database
│   └── logs/                # Audit and operational logs
├── tests/                   # Automated pytest suite (20 tests covering all core modules)
├── requirements.txt         # Python dependencies
├── .env.example             # Configuration placeholders
└── README.md
```

---

## 2. Windows 11 Local Server Setup

### 2.1. Check Python Version
```powershell
python --version
# Output: Python 3.11+ or Python 3.14+
```

### 2.2. Install Dependencies
```powershell
python -m pip install -r backend/requirements.txt
```

### 2.3. Run Server on Local Network
```powershell
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 5000
```

When started, the server is available at:
* **Interactive API Docs (Swagger):** `http://localhost:5000/docs`
* **Alternative API Docs (ReDoc):** `http://localhost:5000/redoc`
* **Health Check:** `http://localhost:5000/api/health`
* **Fleet Bootstrap Sync:** `http://localhost:5000/api/sync`
* **Live SSE Stream:** `http://localhost:5000/api/live/stream`

---

## 3. Local Wi-Fi Access From Phones & Laptops

### 3.1. Find Host LAN IPv4 Address
In PowerShell:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" } | Select-Object IPAddress
```
*(Example output: `10.202.99.63`)*

### 3.2. Allow Port 5000 in Windows Defender Firewall
Open PowerShell as Administrator and run once:
```powershell
New-NetFirewallRule -DisplayName "DCE Bus Tracker Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Private
```

### 3.3. Access from Mobile Device on the Same Wi-Fi
Open a mobile browser connected to the same Wi-Fi network:
* **App URL:** `http://<SERVER-LAN-IP>:5000` (e.g. `http://10.202.99.63:5000`)
* **Driver Tracking Page:** `http://<SERVER-LAN-IP>:5000/#staff`

> **Note on Geolocation Permissions:** Modern browsers require HTTPS or `localhost` to access the device GPS hardware. When testing from a phone on plain HTTP (`http://10.202.99.63:5000`), Chrome/Safari may restrict GPS access. For real field tests, either run from `localhost`, use the Android Capacitor APK, or use an SSL reverse proxy.

---

## 4. Real Driver GPS Tracking

### 4.1. Driver Ingestion Endpoint
`POST /api/driver/telemetry`
```json
{
  "busId": "bus-07",
  "busNumber": "DCE-BUS-07",
  "latitude": 12.9249,
  "longitude": 80.1165,
  "speed": 32.0,
  "heading": 180.0,
  "accuracy": 4.5,
  "timestamp": 1791519978306,
  "isSimulated": false
}
```

### 4.2. Geofence & Status Rules
* **🟢 Green (`at_station`):** Bus is stopped/waiting at a station ($r \le 60\text{ m}$).
* **🔴 Red (`moving`):** Bus has departed and is en route to next stop.
* **🟡 Yellow (`destination`):** Bus has reached terminus ($r \le 120\text{ m}$).
* **⚪ Grey (`stale`):** GPS signal lost ($> 45\text{ s}$).

### 4.3. Anti-Jitter Safety Filter
Physical velocity between consecutive GPS updates is validated. Jumps $> 150\text{ km/h}$ are rejected automatically to prevent teleportation anomalies.

---

## 5. Running Automated Tests

Run the full pytest suite in PowerShell:
```powershell
python -c "import sys; sys.path.insert(0, r'D:\Lib\site-packages'); sys.path.insert(0, r'D:\github'); import pytest; sys.exit(pytest.main(['D:/github/backend/tests', '-v']))"
```
**Results:** 20/20 tests passing (Health, Auth, Buses, Routes, Stops, GPS, Geofencing, Deduplication, Simulated sender, and SSE).

---

## 6. Database Backup & Restore

* **Backup:** Simply copy `backend/data/bus_tracker.db` to a backup directory.
```powershell
Copy-Item "D:\github\backend\data\bus_tracker.db" "D:\github\backend\data\backup_bus_tracker.db"
```
* **Restore:** Replace `backend/data/bus_tracker.db` with the backup copy and restart the server.
