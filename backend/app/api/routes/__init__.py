from fastapi import APIRouter
from app.api.routes.monitors import router as monitors_router
from app.api.routes.dashboard import router as dashboard_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(monitors_router)
api_router.include_router(dashboard_router)
