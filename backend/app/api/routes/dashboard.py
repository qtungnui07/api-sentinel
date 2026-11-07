from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.monitor import DashboardOverview, IncidentRead, LatencyDataPoint
from app.services.stats import (
    calculate_dashboard_overview,
    get_dashboard_incidents,
    get_dashboard_latency_points,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverview)
def get_overview(db: Session = Depends(get_db)):
    return calculate_dashboard_overview(db)


@router.get("/latency", response_model=List[LatencyDataPoint])
def get_latency(
    range: str = Query("24h", pattern="^(1h|24h|7d|all)$"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return get_dashboard_latency_points(db, range_str=range, limit=limit)


@router.get("/incidents", response_model=List[IncidentRead])
def get_incidents(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_dashboard_incidents(db, limit=limit)
