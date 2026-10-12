def test_admin_login_success(client):
    """Test administrator login with valid credentials."""
    res = client.post("/api/admin/login", json={"email": "admin@dce.edu", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["admin"]["role"] == "admin"

def test_admin_login_invalid(client):
    """Test administrator login rejection with wrong password."""
    res = client.post("/api/admin/login", json={"email": "admin@dce.edu", "password": "wrongpassword"})
    assert res.status_code == 401
    data = res.json()
    assert "Invalid Administrator credentials" in data["detail"]

def test_staff_login_success(client):
    """Test driver login with email/phone credentials."""
    res = client.post("/api/staff/login", json={"email": "murugan@dce.edu", "password": "dce2024"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["staff"]["assignedBusId"] == "bus-07"

def test_staff_login_invalid(client):
    """Test driver login rejection with invalid credentials."""
    res = client.post("/api/staff/login", json={"email": "murugan@dce.edu", "password": "wrongpassword"})
    assert res.status_code == 401

def test_staff_profile(client):
    """Test staff profile retrieval."""
    res = client.get("/api/staff/profile")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "staff" in data
    assert "bus" in data
    assert "route" in data
