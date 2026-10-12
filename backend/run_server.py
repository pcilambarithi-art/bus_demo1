import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add site-packages and project root to sys.path
site_pkgs = Path("D:/Lib/site-packages")
if site_pkgs.exists() and str(site_pkgs) not in sys.path:
    sys.path.insert(0, str(site_pkgs))

proj_root = Path(__file__).resolve().parent.parent
if str(proj_root) not in sys.path:
    sys.path.insert(0, str(proj_root))

import uvicorn
from backend.app.config import settings

if __name__ == "__main__":
    print("\n======================================================")
    print("🚀 Dhanalakshmi College of Engineering Bus Tracker (FastAPI)")
    print(f"🌐 Local URL:           http://localhost:{settings.PORT}")
    print(f"📡 API Documentation:   http://localhost:{settings.PORT}/docs")
    print(f"🔄 Fleet Sync:          GET http://localhost:{settings.PORT}/api/sync")
    print(f"🛰️  Live Stream (SSE):   GET http://localhost:{settings.PORT}/api/live/stream")
    print("======================================================\n")

    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
