import time

def test_valid_gps_submission(client):
    """Test valid driver GPS telemetry ingestion."""
    payload = {
        "busId": "bus-07",
        "busNumber": "DCE-BUS-07",
        "latitude": 12.9249,
        "longitude": 80.1165,
        "speed": 28.0,
        "heading": 90.0,
        "accuracy": 4.5,
        "timestamp": int(time.time() * 1000),
        "isSimulated": False
    }
    res = client.post("/api/driver/telemetry", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["bus"]["busNumber"] == "DCE-BUS-07"
    assert data["bus"]["isSimulated"] is False

def test_invalid_coordinates_bounds(client):
    """Test rejection of out-of-bounds latitude/longitude."""
    payload = {
        "busId": "bus-07",
        "latitude": 95.0, # Invalid > 90
        "longitude": 80.1165,
        "speed": 20.0
    }
    res = client.post("/api/driver/telemetry", json=payload)
    assert res.status_code == 422 # Pydantic schema validation error

def test_simulated_gps_flag_distinction(client):
    """Test explicit distinction of test/simulated coordinates."""
    payload = {
        "busId": "bus-04",
        "busNumber": "DCE-BUS-04",
        "latitude": 12.9675,
        "longitude": 80.1491,
        "speed": 30.0,
        "isSimulated": True
    }
    res = client.post("/api/driver/telemetry", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["bus"]["isSimulated"] is True

def test_live_buses_latest_status(client):
    """Test latest bus status list."""
    res = client.get("/api/live/buses")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["buses"]) >= 5
    bus7 = next((b for b in data["buses"] if b["busNumber"] == "DCE-BUS-07"), None)
    assert bus7 is not None
    assert bus7["statusIndicator"] in ("green", "red", "yellow", "grey")
