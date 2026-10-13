"""
Hardware-Independent Bus Agent Simulator (STRICTLY FOR AUTOMATED TESTING)
Clearly labels all generated NMEA sentences, GPS updates, and RFID taps as
[SIMULATED TEST MODE] so simulated data is never mistaken for physical hardware.
"""
import time
import logging
from typing import List, Dict, Any

from .gps_reader import parse_nmea_sentence

logger = logging.getLogger("dce_pi_agent.simulator")


def decimal_to_nmea_lat(lat: float) -> tuple[str, str]:
    hemi = "N" if lat >= 0 else "S"
    abs_val = abs(lat)
    deg = int(abs_val)
    mins = (abs_val - deg) * 60.0
    return f"{deg:02d}{mins:07.4f}", hemi


def decimal_to_nmea_lng(lng: float) -> tuple[str, str]:
    hemi = "E" if lng >= 0 else "W"
    abs_val = abs(lng)
    deg = int(abs_val)
    mins = (abs_val - deg) * 60.0
    return f"{deg:03d}{mins:07.4f}", hemi


def build_simulated_gprmc(lat: float, lng: float, speed_kmh: float = 25.0, heading: float = 180.0) -> str:
    """Builds a valid NMEA-0183 $GPRMC sentence with XOR checksum for automated software testing."""
    lat_str, lat_h = decimal_to_nmea_lat(lat)
    lng_str, lng_h = decimal_to_nmea_lng(lng)
    knots = round(speed_kmh / 1.852, 2)
    body = f"GPRMC,083000,A,{lat_str},{lat_h},{lng_str},{lng_h},{knots:.2f},{heading:.1f},131026,000.0,W"
    calc = 0
    for ch in body:
        calc ^= ord(ch)
    return f"${body}*{calc:02X}"


def generate_simulated_route_fixes(waypoints: List[Dict[str, float]]) -> List[Dict[str, Any]]:
    """
    Converts a list of test waypoints into parsed NMEA fixes explicitly marked with
    isSimulated=True and simulationBanner='[SIMULATED TEST MODE]'.
    """
    results = []
    for idx, wp in enumerate(waypoints):
        sentence = build_simulated_gprmc(
            lat=wp["lat"],
            lng=wp["lng"],
            speed_kmh=wp.get("speed_kmh", 24.0),
            heading=wp.get("heading", 180.0)
        )
        parsed = parse_nmea_sentence(sentence)
        if parsed:
            parsed["isSimulated"] = True
            parsed["simulationBanner"] = "[SIMULATED TEST MODE — NO PHYSICAL HARDWARE ATTACHED]"
            parsed["nmeaSentence"] = sentence
            parsed["timestamp_ms"] = int(time.time() * 1000) + (idx * 2000)
            results.append(parsed)
    return results
