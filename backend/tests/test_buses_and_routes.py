def test_list_buses(client):
    """Test listing all college buses."""
    res = client.get("/api/buses")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] >= 5
    bus_numbers = [b["busNumber"] for b in data["buses"]]
    assert "DCE-BUS-07" in bus_numbers

def test_get_bus_details(client):
    """Test retrieving single bus specifications."""
    res = client.get("/api/buses/bus-07")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["bus"]["busNumber"] == "DCE-BUS-07"

def test_list_routes(client):
    """Test listing all routes with ordered stops."""
    res = client.get("/api/routes")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] >= 4
    route_codes = [r["code"] for r in data["routes"]]
    assert "R-07" in route_codes

def test_list_stops(client):
    """Test listing all route bus stops."""
    res = client.get("/api/stops")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] >= 20
