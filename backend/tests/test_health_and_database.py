def test_health_endpoint(client):
    """Test health endpoint and database readiness."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"]["connected"] is True
    assert data["database"]["type"] == "SQLite"
    assert data["database"]["activeBuses"] >= 5

def test_sync_endpoint(client):
    """Test single source of truth sync endpoint returning fleet snapshot."""
    res = client.get("/api/sync")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["buses"]) >= 5
    assert len(data["routes"]) >= 4
    assert len(data["stops"]) >= 20
    assert data["systemHealth"]["status"] == "ONLINE"
