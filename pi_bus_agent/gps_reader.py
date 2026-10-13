import time
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("dce_pi_agent.gps_reader")


def validate_nmea_checksum(sentence: str) -> bool:
    """
    Validates NMEA-0183 XOR checksum (*XX) for sentences emitted by the
    u-blox NEO-6M (MP510_GPS_V02_WWXL) module.
    """
    sentence = sentence.strip()
    if not sentence.startswith("$") or "*" not in sentence:
        return False
    body, checksum_hex = sentence[1:].split("*", 1)
    if len(checksum_hex) < 2:
        return False
    try:
        expected = int(checksum_hex[:2], 16)
    except ValueError:
        return False

    calc = 0
    for ch in body:
        calc ^= ord(ch)
    return calc == expected


def parse_nmea_coordinate(raw_val: str, hemisphere: str) -> Optional[float]:
    """
    Converts NMEA DDMM.MMMMM (latitude) or DDDMM.MMMMM (longitude) into signed decimal degrees.
    """
    if not raw_val or not hemisphere or "." not in raw_val:
        return None
    try:
        dot_idx = raw_val.index(".")
        deg_len = dot_idx - 2
        if deg_len < 1:
            return None
        degrees = float(raw_val[:deg_len])
        minutes = float(raw_val[deg_len:])
        decimal = degrees + (minutes / 60.0)
        if hemisphere.upper() in ("S", "W"):
            decimal = -decimal
        return round(decimal, 6)
    except ValueError:
        return None


def parse_nmea_sentence(sentence: str) -> Optional[Dict[str, Any]]:
    """
    Parses $GPRMC / $GNRMC and $GPGGA / $GNGGA NMEA sentences.
    Returns validated fix dictionary or None if fix is invalid (e.g. 'V' Void or Fix Quality 0).
    """
    if not validate_nmea_checksum(sentence):
        return None

    clean = sentence.strip().split("*")[0]
    parts = clean.split(",")
    msg_type = parts[0].upper()

    # 1. Recommended Minimum Specific GPS/Transit Data ($GPRMC / $GNRMC)
    if msg_type in ("$GPRMC", "$GNRMC") and len(parts) >= 10:
        status = parts[2].upper() # 'A' = Active valid fix, 'V' = Void (no satellite lock)
        if status != "A":
            return {"fix_valid": False, "reason": "RMC status Void (no satellite lock)"}

        lat = parse_nmea_coordinate(parts[3], parts[4])
        lng = parse_nmea_coordinate(parts[5], parts[6])
        if lat is None or lng is None or (abs(lat) < 0.001 and abs(lng) < 0.001):
            return {"fix_valid": False, "reason": "Invalid or zero coordinates"}

        speed_knots = float(parts[7]) if parts[7] else 0.0
        speed_kmh = round(speed_knots * 1.852, 2)
        heading = float(parts[8]) if parts[8] else 0.0

        return {
            "fix_valid": True,
            "fix_type": "3D_FIX",
            "latitude": lat,
            "longitude": lng,
            "speed_kmh": speed_kmh,
            "heading": heading,
            "accuracy_m": 4.5,
            "timestamp_ms": int(time.time() * 1000)
        }

    # 2. Global Positioning System Fix Data ($GPGGA / $GNGGA)
    if msg_type in ("$GPGGA", "$GNGGA") and len(parts) >= 10:
        fix_quality = int(parts[6]) if parts[6].isdigit() else 0
        satellites = int(parts[7]) if parts[7].isdigit() else 0
        hdop = float(parts[8]) if parts[8] else 99.9

        if fix_quality == 0 or satellites < 3:
            return {"fix_valid": False, "reason": f"GGA no fix (quality={fix_quality}, sats={satellites})"}

        lat = parse_nmea_coordinate(parts[2], parts[3])
        lng = parse_nmea_coordinate(parts[4], parts[5])
        if lat is None or lng is None:
            return {"fix_valid": False, "reason": "Malformed GGA coordinates"}

        return {
            "fix_valid": True,
            "fix_type": "3D_FIX" if satellites >= 4 else "2D_FIX",
            "latitude": lat,
            "longitude": lng,
            "satellites": satellites,
            "hdop": hdop,
            "accuracy_m": round(max(2.5, hdop * 2.5), 1),
            "timestamp_ms": int(time.time() * 1000)
        }

    return None


class NEO6MSerialReader:
    """
    Reads live NMEA-0183 serial stream from the u-blox NEO-6M (MP510_GPS_V02_WWXL)
    connected to Raspberry Pi 5 UART (/dev/ttyAMA0 at 9600 baud, 3.3V logic).
    Strictly refuses to fabricate coordinates when running in production mode.
    """

    def __init__(self, port: str = "/dev/ttyAMA0", baud_rate: int = 9600):
        self.port = port
        self.baud_rate = baud_rate
        self.serial_conn = None
        self.last_fix_status = "NO_FIX"
        self.last_valid_fix: Optional[Dict[str, Any]] = None

    def connect(self) -> bool:
        try:
            import serial
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=2.0
            )
            logger.info(f"Connected to NEO-6M GPS UART on {self.port} @ {self.baud_rate} baud")
            return True
        except Exception as e:
            logger.error(f"Hardware UART {self.port} unavailable: {e}")
            self.serial_conn = None
            return False

    def read_fix(self, max_lines: int = 15) -> Optional[Dict[str, Any]]:
        """
        Reads up to max_lines from the NEO-6M serial buffer until a valid RMC/GGA fix is obtained.
        """
        if not self.serial_conn:
            if not self.connect():
                self.last_fix_status = "NO_HARDWARE"
                return None

        try:
            for _ in range(max_lines):
                raw_line = self.serial_conn.readline().decode("ascii", errors="ignore").strip()
                if not raw_line:
                    continue
                parsed = parse_nmea_sentence(raw_line)
                if parsed:
                    if parsed.get("fix_valid"):
                        self.last_fix_status = parsed.get("fix_type", "3D_FIX")
                        self.last_valid_fix = parsed
                        return parsed
                    else:
                        self.last_fix_status = "NO_FIX"
        except Exception as e:
            logger.warning(f"Serial read error on {self.port}: {e}")
            self.serial_conn = None
            self.last_fix_status = "SERIAL_ERROR"

        return None
