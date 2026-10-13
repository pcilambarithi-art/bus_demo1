import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.device import Device
from ..models.bus import Bus
from ..models.route import Route
from ..models.stop import Stop
from ..models.gps import GPSHistory, BusLatestLocation
from ..schemas.device import DeviceHeartbeatRequest, DeviceGPSBatchSyncRequest
from ..security.permissions import verify_device_credentials
from ..services.geofencing import evaluate_geofencing_and_state
from ..services.live_updates import sse_manager

router = APIRouter(tags=["Raspberry Pi 5 Bus Agents & 4G Telemetry Sync"])


def _serialize_device(d: Device) -> dict:
    now = datetime.utcnow()
    secs_ago = int((now - d.last_heartbeat).total_seconds()) if d.last_heartbeat else 9999
    # Consider device online if heartbeat or sync received within last 60 seconds
    is_live_heartbeat = secs_ago <= 60 and d.is_online
    last_ts_ms = int(d.last_heartbeat.timestamp() * 1000) if d.last_heartbeat else 0
    last_iso = (d.last_heartbeat.isoformat() + "Z") if d.last_heartbeat else ""
    return {
        "id": d.id,
        "busId": d.bus_id,
        "deviceName": d.device_name,
        "hardwareModel": d.hardware_model,
        "modemModel": d.modem_model,
        "firmwareVersion": d.firmware_version,
        "ipAddress": d.ip_address,
        "signalCsq": d.signal_csq,
        "signalQualityLabel": "Excellent (4G LTE)" if (d.signal_csq or 0) >= 20 else ("Moderate (4G)" if (d.signal_csq or 0) >= 12 else "Weak Signal"),
        "gpsFixStatus": d.gps_fix_status,
        "batteryVoltage": d.battery_voltage,
        "cpuTempC": d.cpu_temp_c,
        "lastHeartbeat": last_ts_ms,
        "lastSyncedAt": last_ts_ms,
        "lastSyncedIso": last_iso,
        "secondsSinceHeartbeat": secs_ago,
        "isOnline": is_live_heartbeat,
        "isActive": d.is_active
    }



@router.get("/devices")
def list_bus_devices(db: Session = Depends(get_db)):
    """Lists all registered Raspberry Pi 5 bus agents and their 4G/GPS hardware health."""
    devices = db.query(Device).order_by(Device.id.asc()).all()
    return {
        "success": True,
        "devices": [_serialize_device(d) for d in devices],
        "count": len(devices)
    }


@router.post("/devices/heartbeat")
async def device_heartbeat(
    payload: DeviceHeartbeatRequest,
    x_device_id: Optional[str] = Header(None),
    x_device_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Receives periodic health telemetry from a Raspberry Pi 5 bus agent over 4G.
    Monitors modem CSQ signal, NEO-6M GPS fix status, bus battery voltage, and CPU temperature.
    """
    eff_device_id = x_device_id or payload.deviceId
    device = verify_device_credentials(
        db,
        eff_device_id,
        x_device_key,
        target_bus_id=payload.busId,
        require_strict=True
    )

    device.firmware_version = payload.firmwareVersion or device.firmware_version
    device.modem_model = payload.modemModel or device.modem_model
    device.ip_address = payload.ipAddress or device.ip_address
    device.signal_csq = payload.signalCsq if payload.signalCsq is not None else device.signal_csq
    device.gps_fix_status = payload.gpsFixStatus or device.gps_fix_status
    device.battery_voltage = payload.batteryVoltage if payload.batteryVoltage is not None else device.battery_voltage
    device.cpu_temp_c = payload.cpuTempC if payload.cpuTempC is not None else device.cpu_temp_c
    device.last_heartbeat = datetime.utcnow()
    device.is_online = True

    db.commit()
    db.refresh(device)

    serialized = _serialize_device(device)
    await sse_manager.broadcast({
        "type": "DEVICE_HEARTBEAT",
        "device": serialized,
        "pendingGpsCount": payload.pendingGpsCount,
        "pendingAttendanceCount": payload.pendingAttendanceCount,
        "timestamp": int(time.time() * 1000)
    })

    return {
        "success": True,
        "device": serialized,
        "serverTimestamp": int(time.time() * 1000)
    }


@router.post("/devices/gps-batch")
async def sync_offline_gps_batch(
    payload: DeviceGPSBatchSyncRequest,
    x_device_id: Optional[str] = Header(None),
    x_device_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Synchronizes queued GPS coordinates recorded by the Raspberry Pi 5 agent during a 4G network outage.
    - Enforces device-to-bus authentication and assignment.
    - Deduplicates retried batches using deterministic device timestamps.
    - Preserves historical breadcrumbs in GPSHistory with separate device_timestamp and received_at.
    - Protects BusLatestLocation from being overwritten by delayed/out-of-order historical coordinates.
    """
    eff_device_id = x_device_id or payload.deviceId
    verify_device_credentials(
        db,
        eff_device_id,
        x_device_key,
        target_bus_id=payload.busId,
        require_strict=True
    )

    bus = db.query(Bus).filter(Bus.id == payload.busId).first()
    if not bus:
        raise HTTPException(status_code=404, detail=f"Bus '{payload.busId}' not found")

    # Sort points chronologically by device timestamp to handle out-of-order queue items
    sorted_points = sorted(payload.points, key=lambda p: p.timestamp)

    acknowledged_ids = []
    inserted_count = 0
    duplicate_count = 0
    latest_updated = False

    latest = db.query(BusLatestLocation).filter(BusLatestLocation.bus_id == bus.id).first()
    route = db.query(Route).filter(Route.id == bus.route_id).first() if bus.route_id else None
    stops = db.query(Stop).filter(Stop.route_id == bus.route_id).order_by(Stop.sequence.asc()).all() if bus.route_id else []

    for pt in sorted_points:
        pt_dt = datetime.utcfromtimestamp(pt.timestamp / 1000.0)

        # Deduplicate: check if this exact device timestamp for this bus is already stored

        existing = db.query(GPSHistory).filter(
            GPSHistory.bus_id == bus.id,
            GPSHistory.device_timestamp == pt_dt
        ).first()

        if existing:
            duplicate_count += 1
            acknowledged_ids.append(pt.eventId)
            continue

        gps_rec = GPSHistory(
            bus_id=bus.id,
            bus_number=bus.bus_number,
            latitude=pt.latitude,
            longitude=pt.longitude,
            speed=pt.speed or 0.0,
            heading=pt.heading or 0.0,
            accuracy=pt.accuracy or 4.5,
            is_simulated=False,
            is_valid=True,
            rejection_reason=None,
            device_timestamp=pt_dt,
            received_at=datetime.utcnow()
        )
        db.add(gps_rec)
        inserted_count += 1
        acknowledged_ids.append(pt.eventId)

        # Only advance live bus position if this point is newer than the current latest location
        if not latest or not latest.last_updated or pt_dt >= latest.last_updated:
            telemetry_state, _ = evaluate_geofencing_and_state(
                db=db,
                bus=bus,
                lat=pt.latitude,
                lng=pt.longitude,
                speed=pt.speed or 0.0,
                route=route,
                stops=stops
            )
            bus.current_lat = pt.latitude
            bus.current_lng = pt.longitude
            bus.current_speed = pt.speed or 0.0
            bus.last_updated = pt_dt

            if not latest:
                latest = BusLatestLocation(bus_id=bus.id, bus_number=bus.bus_number)
                db.add(latest)

            latest.latitude = pt.latitude
            latest.longitude = pt.longitude
            latest.speed = pt.speed or 0.0
            latest.heading = pt.heading or 0.0
            latest.accuracy = pt.accuracy or 4.5
            latest.status = telemetry_state.get("status", "moving")
            latest.status_indicator = telemetry_state.get("statusIndicator", "red")
            latest.status_label = telemetry_state.get("statusLabel", "Moving")
            latest.last_updated = pt_dt
            latest_updated = True

    db.commit()

    return {
        "success": True,
        "deviceId": payload.deviceId,
        "busId": bus.id,
        "insertedCount": inserted_count,
        "duplicateCount": duplicate_count,
        "latestPositionUpdated": latest_updated,
        "acknowledgedEventIds": acknowledged_ids
    }
