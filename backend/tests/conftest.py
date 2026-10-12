import sys
from pathlib import Path

# Ensure site-packages and project root are in sys.path
_site_pkgs = Path("D:/Lib/site-packages")
if _site_pkgs.exists() and str(_site_pkgs) not in sys.path:
    sys.path.insert(0, str(_site_pkgs))

_proj_root = Path(__file__).resolve().parent.parent.parent
if str(_proj_root) not in sys.path:
    sys.path.insert(0, str(_proj_root))

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db, SessionLocal, seed_database_if_empty

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    init_db()
    db = SessionLocal()
    seed_database_if_empty(db)
    db.close()
    yield

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
