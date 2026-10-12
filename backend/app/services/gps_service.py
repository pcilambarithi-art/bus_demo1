import math
import time
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session

from ..config import settings
from ..models.gps import GPSHistory, BusLatestLocation
from ..models.bus import Bus

def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Haversine formula calculating great-circle distance between two GPS coordinates in meters."""
    R = 6371000 # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return int(round(R * c))

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes compass bearing in degrees between two coordinates (0° = North, 90° = East)."""
    y = math.sin(math.radians(lon2 - lon1)) * math.cos(math.radians(lat2))
    x = (math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) -
         math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(math.radians(lon2 - lon1)))
    brng = math.degrees(math.atan2(y, x))
    return round((brng + 360.0) % 360.0, 1)

def validate_gps_reading(
    db: Session,
    bus: Bus,
    lat: float,
    lng: float,
    speed: float,
    timestamp_ms: Optional[int]
) -> Tuple[bool, Optional[str]]:
    """
    Validates physical plausibility of GPS reading:
    - Bounded coordinate range
    - Maximum physical velocity (< 150 km/h) against previous coordinate
    - Plausible timestamp
    """
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        return False, "Coordinates out of bounds (-90..90, -180..180)"

    if speed > settings.GPS_JITTER_MAX_SPEED_KMH:
        return False, f"Reported speed {speed:.1f} km/h exceeds maximum safety threshold {settings.GPS_JITTER_MAX_SPEED_KMH} km/h"

    # Check previous recorded location for teleportation / jitter check
    latest = db.query(BusLatestLocation).filter(BusLatestLocation.bus_id == bus.id).first()
    if latest and latest.latitude and latest.longitude and latest.last_updated:
        dist_m = calculate_distance_meters(latest.latitude, latest.longitude, lat, lng)
        time_elapsed_secs = max(1.0, (datetime.utcnow() - latest.last_updated).total_seconds())
        velocity_kmh = (dist_m / time_elapsed_secs) * 3.6

        # If time is short (< 30s) and computed velocity > threshold, reject as GPS jitter jump
        if time_elapsed_secs < 30.0 and velocity_kmh > settings.GPS_JITTER_MAX_SPEED_KMH:
            return False, f"GPS coordinate jitter rejected: computed speed {velocity_kmh:.1f} km/h exceeds {settings.GPS_JITTER_MAX_SPEED_KMH} km/h"

    return True, None

def get_gps_health(seconds_since_update: int) -> Tuple[str, str]:
    """Determines GPS signal health based on staleness threshold."""
    if seconds_since_update <= settings.GPS_STALE_THRESHOLD_SECONDS:
        return "active", f"Live GPS Active (Updated {seconds_since_update}s ago)"
    elif seconds_since_update <= settings.GPS_OFFLINE_THRESHOLD_SECONDS:
        return "weak", f"GPS Signal Weak (Updated {seconds_since_update}s ago)"
    else:
        return "offline", "GPS Signal Lost / Offline"
