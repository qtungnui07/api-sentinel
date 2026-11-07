import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.monitor import CheckResult, Monitor, MonitorStatus
from app.monitoring.checker import run_monitor_check
from app.monitoring.scheduler import schedule_monitor, unschedule_monitor
from app.schemas.monitor import (
    CheckResultRead,
    MonitorCreate,
    MonitorRead,
    MonitorStats,
    MonitorUpdate,
)
from app.services.ssrf import SSRFProtectionError, validate_and_resolve_url
from app.services.stats import calculate_monitor_stats, get_time_threshold

router = APIRouter(prefix="/monitors", tags=["monitors"])


def populate_monitor_read(monitor: Monitor, db: Session) -> MonitorRead:
    stats = calculate_monitor_stats(db, monitor.id, range_str="24h")
    read_obj = MonitorRead.model_validate(monitor)
    read_obj.uptime_percentage = stats.uptime_percentage
    read_obj.avg_response_time_ms = stats.avg_response_time_ms
    return read_obj


@router.get("", response_model=List[MonitorRead])
def list_monitors(db: Session = Depends(get_db)):
    monitors = db.query(Monitor).order_by(desc(Monitor.created_at)).all()
    return [populate_monitor_read(m, db) for m in monitors]


@router.post("", response_model=MonitorRead, status_code=status.HTTP_201_CREATED)
def create_monitor(payload: MonitorCreate, db: Session = Depends(get_db)):
    # Validate SSRF immediately so user gets direct feedback
    try:
        validate_and_resolve_url(payload.url)
    except SSRFProtectionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security check failed: {str(e)}",
        )

    monitor = Monitor(
        name=payload.name,
        url=payload.url,
        method=payload.method.value,
        interval_seconds=payload.interval_seconds,
        timeout_seconds=payload.timeout_seconds,
        expected_status_code=payload.expected_status_code,
        status=MonitorStatus.PENDING.value,
        is_active=True,
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)

    # Schedule monitor and trigger immediate check
    schedule_monitor(monitor.id, monitor.interval_seconds, trigger_immediately=True)

    return populate_monitor_read(monitor, db)


@router.get("/{id}", response_model=MonitorRead)
def get_monitor(id: str, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")
    return populate_monitor_read(monitor, db)


@router.patch("/{id}", response_model=MonitorRead)
def update_monitor(id: str, payload: MonitorUpdate, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    if payload.url is not None:
        try:
            validate_and_resolve_url(payload.url)
        except SSRFProtectionError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Security check failed: {str(e)}",
            )
        monitor.url = payload.url

    if payload.name is not None:
        monitor.name = payload.name
    if payload.method is not None:
        monitor.method = payload.method.value
    if payload.timeout_seconds is not None:
        monitor.timeout_seconds = payload.timeout_seconds
    if payload.expected_status_code is not None:
        monitor.expected_status_code = payload.expected_status_code

    interval_changed = False
    if payload.interval_seconds is not None and payload.interval_seconds != monitor.interval_seconds:
        monitor.interval_seconds = payload.interval_seconds
        interval_changed = True

    db.commit()
    db.refresh(monitor)

    if interval_changed and monitor.is_active and monitor.status != MonitorStatus.PAUSED.value:
        schedule_monitor(monitor.id, monitor.interval_seconds, trigger_immediately=False)

    return populate_monitor_read(monitor, db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_monitor(id: str, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    unschedule_monitor(id)
    db.delete(monitor)
    db.commit()
    return None


@router.post("/{id}/pause", response_model=MonitorRead)
def pause_monitor(id: str, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    unschedule_monitor(id)
    monitor.status = MonitorStatus.PAUSED.value
    db.commit()
    db.refresh(monitor)
    return populate_monitor_read(monitor, db)


@router.post("/{id}/resume", response_model=MonitorRead)
def resume_monitor(id: str, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    monitor.status = MonitorStatus.PENDING.value
    db.commit()
    db.refresh(monitor)

    schedule_monitor(monitor.id, monitor.interval_seconds, trigger_immediately=True)
    return populate_monitor_read(monitor, db)


@router.post("/{id}/check", response_model=CheckResultRead)
async def check_monitor_now(id: str, db: Session = Depends(get_db)):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    result = await run_monitor_check(id)
    if not result:
        # If already checking or paused
        latest = (
            db.query(CheckResult)
            .filter(CheckResult.monitor_id == id)
            .order_by(desc(CheckResult.checked_at))
            .first()
        )
        if latest:
            return latest
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A check is currently running or monitor is paused",
        )
    return result


@router.get("/{id}/history", response_model=List[CheckResultRead])
def get_monitor_history(
    id: str,
    range: str = Query("24h", pattern="^(1h|24h|7d|all)$"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    query = db.query(CheckResult).filter(CheckResult.monitor_id == id)
    threshold = get_time_threshold(range)
    if threshold:
        query = query.filter(CheckResult.checked_at >= threshold)

    results = query.order_by(desc(CheckResult.checked_at)).limit(limit).all()
    return results


@router.get("/{id}/stats", response_model=MonitorStats)
def get_monitor_stats(
    id: str,
    range: str = Query("24h", pattern="^(1h|24h|7d|all)$"),
    db: Session = Depends(get_db),
):
    monitor = db.query(Monitor).filter(Monitor.id == id).first()
    if not monitor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Monitor not found")

    return calculate_monitor_stats(db, id, range_str=range)
