import time

def test_geofencing_and_deduplication(client):
    """
    Test that arriving at a stop generates an arrival event,
    and subsequent coordinates at the same stop do NOT duplicate the event.
    """
    # 1. Post coordinate at Tambaram West Stand (stop-07-3: 12.9249, 80.1165)
    payload1 = {
        "busId": "bus-07",
        "busNumber": "DCE-BUS-07",
        "latitude": 12.9249,
        "longitude": 80.1165,
        "speed": 0.0,
        "timestamp": int(time.time() * 1000)
    }
    res1 = client.post("/api/driver/telemetry", json=payload1)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["bus"]["statusIndicator"] == "green" # At station

    # 2. Send another reading at the same stop within geofence
    payload2 = {
        "busId": "bus-07",
        "busNumber": "DCE-BUS-07",
        "latitude": 12.92491,
        "longitude": 80.11651,
        "speed": 0.0,
        "timestamp": int(time.time() * 1000) + 3000
    }
    res2 = client.post("/api/driver/telemetry", json=payload2)
    assert res2.status_code == 200
    data2 = res2.json()
    # Deduplication check: events array should NOT have a duplicate ARRIVED event
    arr_events = [e for e in data2.get("events", []) if e.get("event_type") == "ARRIVED"]
    assert len(arr_events) == 0

def test_live_history_endpoint(client):
    """Test retrieval of event notification history."""
    res = client.get("/api/live/history?busNumber=DCE-BUS-07")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "history" in data
