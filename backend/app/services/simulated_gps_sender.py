import time
import requests
import logging

logger = logging.getLogger("dce_transit.simulated_gps")

# Sample route coordinates from Tambaram to DCE Campus, Manimangalam
DCE_ROUTE_7_WAYPOINTS = [
    {"name": "Tambaram West Stand", "lat": 12.9249, "lng": 80.1165, "speed": 0.0},
    {"name": "En route Tambaram-Mudichur Road", "lat": 12.9210, "lng": 80.1020, "speed": 34.0},
    {"name": "Mudichur Road Junction", "lat": 12.9150, "lng": 80.0820, "speed": 10.0},
    {"name": "Mannivakkam Bridge", "lat": 12.9050, "lng": 80.0630, "speed": 38.0},
    {"name": "Manimangalam Road Entrance", "lat": 12.9010, "lng": 80.0510, "speed": 32.0},
    {"name": "Dhanalakshmi College of Engineering (DCE)", "lat": 12.8988, "lng": 80.0436, "speed": 0.0}
]

def send_simulated_gps_step(
    base_url: str = "http://127.0.0.1:5000",
    bus_number: str = "DCE-BUS-07",
    bus_id: str = "bus-07",
    step_index: int = 0
) -> dict:
    """
    Sends a single simulated GPS packet explicitly marked with isSimulated=True.
    """
    idx = step_index % len(DCE_ROUTE_7_WAYPOINTS)
    wp = DCE_ROUTE_7_WAYPOINTS[idx]

    payload = {
        "busId": bus_id,
        "busNumber": bus_number,
        "latitude": wp["lat"],
        "longitude": wp["lng"],
        "speed": wp["speed"],
        "heading": 240.0,
        "accuracy": 3.0,
        "timestamp": int(time.time() * 1000),
        "isSimulated": True # Explicitly flagged as simulated test data
    }

    url = f"{base_url.rstrip('/')}/api/driver/telemetry"
    response = requests.post(url, json=payload, timeout=5.0)
    return response.json()

if __name__ == "__main__":
    print("Sending simulated GPS telemetry steps to DCE Transit Server...")
    for i in range(len(DCE_ROUTE_7_WAYPOINTS)):
        res = send_simulated_gps_step(step_index=i)
        print(f"Step {i+1}: {res.get('bus', {}).get('statusLabel')} - Status: {res.get('bus', {}).get('statusIndicator')}")
        time.sleep(2)
