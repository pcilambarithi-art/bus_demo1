import json
import os
import threading
from pathlib import Path

# Locate db.json (shared with server/db.json)
BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR.parent / "server" / "db.json"
if not DB_FILE.exists():
    DB_FILE = BASE_DIR / "db.json"

_db_lock = threading.Lock()
_db_cache = None

DEFAULT_DB_SCHEMA = {
    "admins": [],
    "staff": [],
    "buses": [],
    "routes": [],
    "stops": [],
    "voice_announcements": [],
    "issue_reports": [],
    "activity_logs": [],
}

def load_db():
    global _db_cache
    with _db_lock:
        if DB_FILE.exists():
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    _db_cache = json.load(f)
            except Exception as e:
                print(f"[Python DB] Error loading {DB_FILE}: {e}")
                if _db_cache is None:
                    _db_cache = dict(DEFAULT_DB_SCHEMA)
        else:
            if _db_cache is None:
                _db_cache = dict(DEFAULT_DB_SCHEMA)
        return _db_cache

def save_db():
    global _db_cache
    with _db_lock:
        if _db_cache is None:
            return
        try:
            temp_file = str(DB_FILE) + ".tmp"
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(_db_cache, f, indent=2, ensure_ascii=False)
            os.replace(temp_file, DB_FILE)
        except Exception as e:
            print(f"[Python DB] Error saving {DB_FILE}: {e}")

def get_db():
    global _db_cache
    if _db_cache is None:
        load_db()
    return _db_cache

# Initial load on import
load_db()
