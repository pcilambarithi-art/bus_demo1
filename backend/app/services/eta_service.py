from typing import List, Dict, Any, Optional
from .gps_service import calculate_distance_meters

def calculate_eta_minutes(
    current_lat: float,
    current_lng: float,
    target_lat: float,
    target_lng: float,
    current_speed_kmh: float,
    default_avg_speed_kmh: float = 30.0,
    dwell_seconds: int = 60
) -> int:
    """
    Computes road travel ETA in minutes based on distance, effective travel speed, and stop dwell.
    """
    dist_m = calculate_distance_meters(current_lat, current_lng, target_lat, target_lng)
    
    # Use current speed if moving reliably, otherwise fallback to route average
    effective_speed = current_speed_kmh if current_speed_kmh >= 15.0 else default_avg_speed_kmh
    speed_mps = (effective_speed * 1000.0) / 3600.0

    travel_secs = (dist_m / speed_mps) if speed_mps > 0 else 120.0
    total_secs = travel_secs + dwell_seconds
    return max(1, int(round(total_secs / 60.0)))

def calculate_route_progress(
    current_seq: int,
    total_stops: int
) -> float:
    """Returns progress fraction from 0.0 to 1.0 along route."""
    if total_stops <= 1:
        return 1.0
    return min(1.0, max(0.0, float(current_seq - 1) / float(total_stops - 1)))
