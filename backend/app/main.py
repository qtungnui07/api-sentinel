import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import get_settings
from app.db.session import Base, engine
from app.monitoring.scheduler import shutdown_scheduler, start_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sentinel")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing API Sentinel backend...")
    # Ensure data directory exists if sqlite
    if settings.database_url.startswith("sqlite:///./data/"):
        os.makedirs("data", exist_ok=True)

    # Initialize tables
    Base.metadata.create_all(bind=engine)

    # Start APScheduler
    start_scheduler()

    yield

    # Clean shutdown
    logger.info("Shutting down API Sentinel backend...")
    shutdown_scheduler()


app = FastAPI(
    title=settings.app_name,
    description="Lightweight API Uptime & Performance Observability Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router)


@app.get("/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "scheduler_running": True,
    }
