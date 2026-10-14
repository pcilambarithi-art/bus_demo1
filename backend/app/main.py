import os
import sys
from pathlib import Path

# Ensure site-packages and project root are always on sys.path
_d_site_pkgs = Path("D:/Lib/site-packages")
if _d_site_pkgs.exists() and str(_d_site_pkgs) not in sys.path:
    sys.path.insert(0, str(_d_site_pkgs))

_proj_root = Path(__file__).resolve().parent.parent.parent
if str(_proj_root) not in sys.path:
    sys.path.insert(0, str(_proj_root))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings, DIST_DIR
from .database import engine, Base, SessionLocal, init_db, seed_database_if_empty
from .api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dce_transit.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure SQLite tables exist and seed default data
    logger.info("Initializing Dhanalakshmi College Bus Transit SQLite database...")
    init_db()
    
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()
    
    logger.info("Database initialized successfully.")
    yield
    # Shutdown
    logger.info("Shutting down Dhanalakshmi College Bus Transit Server.")

app = FastAPI(
    title="Dhanalakshmi College of Engineering Bus Tracker API",
    description="Real-Time GPS Fleet Telemetry, Station Geofencing & Transit Administration Engine",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_PREFIX)

# Static Asset Serving & SPA Client-Side Routing Fallback
if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], include_in_schema=False)
async def serve_spa_frontend(request: Request, full_path: str):
    # Guard: do not intercept API routes
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
        return JSONResponse(status_code=404, content={"error": f"API endpoint not found: /{full_path}"})

    if request.method != "GET":
        return JSONResponse(status_code=405, content={"error": f"Method {request.method} not allowed for static routes"})

    # If static file exists directly in dist
    target_file = DIST_DIR / full_path
    if full_path and target_file.exists() and target_file.is_file():
        return FileResponse(target_file)

    # Fallback to SPA index.html
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return JSONResponse(
        status_code=200,
        content={"message": "Dhanalakshmi College Bus Tracker API Server is Running. Frontend not yet built into dist/."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
