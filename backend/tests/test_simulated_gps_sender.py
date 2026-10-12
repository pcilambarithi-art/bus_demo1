from backend.app.services.simulated_gps_sender import DCE_ROUTE_7_WAYPOINTS

def test_simulated_gps_waypoints_structure():
    """Verify that simulated test route has valid coordinates."""
    assert len(DCE_ROUTE_7_WAYPOINTS) >= 5
    for wp in DCE_ROUTE_7_WAYPOINTS:
        assert 12.0 <= wp["lat"] <= 13.5
        assert 79.5 <= wp["lng"] <= 80.5

def test_simulated_gps_step_execution(client):
    """Test simulated GPS ingestion through test client."""
    wp = DCE_ROUTE_7_WAYPOINTS[0]
    payload = {
        "busId": "bus-07",
        "busNumber": "DCE-BUS-07",
        "latitude": wp["lat"],
        "longitude": wp["lng"],
        "speed": wp["speed"],
        "isSimulated": True
    }
    res = client.post("/api/driver/telemetry", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["bus"]["isSimulated"] is True
