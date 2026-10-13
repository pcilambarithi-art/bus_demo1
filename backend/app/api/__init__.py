from fastapi import APIRouter
from .health import router as health_router
from .authentication import router as auth_router
from .buses import router as buses_router
from .routes import router as routes_router
from .stops import router as stops_router
from .gps import router as gps_router
from .notifications import router as notifications_router
from .admin import router as admin_router
from .sync import router as sync_router
from .attendance import router as attendance_router
from .devices import router as devices_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(buses_router)
api_router.include_router(routes_router)
api_router.include_router(stops_router)
api_router.include_router(gps_router)
api_router.include_router(notifications_router)
api_router.include_router(admin_router)
api_router.include_router(sync_router)
api_router.include_router(attendance_router)
api_router.include_router(devices_router)

__all__ = ["api_router"]

