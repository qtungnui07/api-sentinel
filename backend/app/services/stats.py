from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.monitor import CheckResult, Monitor, MonitorStatus
from app.schemas.monitor import (
    DashboardOverview,
    IncidentRead,
    LatencyDataPoint,
    MonitorStats,
)


def get_time_threshold(range_str: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if range_str == "1h":
        return now - timedelta(hours=1)
    elif range_str == "24h":
        return now - timedelta(hours=24)
    elif range_str == "7d":
        return now - timedelta(days=7)
    return None


def calculate_monitor_stats(
    db: Session,
    monitor_id: str,
    range_str: str = "24h",
) -> MonitorStats:
    query = db.query(CheckResult).filter(CheckResult.monitor_id == monitor_id)
    threshold = get_time_threshold(range_str)
    if threshold:
        query = query.filter(CheckResult.checked_at >= threshold)

    total_checks = query.count()
    if total_checks == 0:
        return MonitorStats(
            monitor_id=monitor_id,
            uptime_percentage=None,
            avg_response_time_ms=None,
            min_response_time_ms=None,
            max_response_time_ms=None,
            total_checks=0,
            successful_checks=0,
            failed_checks=0,
            last_successful_check=None,
        )

    successful_checks = query.filter(CheckResult.is_success == True).count()
    failed_checks = total_checks - successful_checks
    uptime_pct = round((successful_checks / total_checks) * 100.0, 2)

    # Aggregate latency
    agg = query.with_entities(
        func.avg(CheckResult.response_time_ms).label("avg_lat"),
        func.min(CheckResult.response_time_ms).label("min_lat"),
        func.max(CheckResult.response_time_ms).label("max_lat"),
    ).first()

    avg_lat = round(float(agg.avg_lat), 2) if agg and agg.avg_lat is not None else None
    min_lat = round(float(agg.min_lat), 2) if agg and agg.min_lat is not None else None
    max_lat = round(float(agg.max_lat), 2) if agg and agg.max_lat is not None else None

    # Last successful check
    last_success = (
        db.query(CheckResult.checked_at)
        .filter(CheckResult.monitor_id == monitor_id, CheckResult.is_success == True)
        .order_by(desc(CheckResult.checked_at))
        .first()
    )

    return MonitorStats(
        monitor_id=monitor_id,
        uptime_percentage=uptime_pct,
        avg_response_time_ms=avg_lat,
        min_response_time_ms=min_lat,
        max_response_time_ms=max_lat,
        total_checks=total_checks,
        successful_checks=successful_checks,
        failed_checks=failed_checks,
        last_successful_check=last_success[0] if last_success else None,
    )


def calculate_dashboard_overview(db: Session) -> DashboardOverview:
    monitors = db.query(Monitor).all()
    total_monitors = len(monitors)
    healthy_monitors = sum(1 for m in monitors if m.status == MonitorStatus.UP.value)
    down_monitors = sum(1 for m in monitors if m.status == MonitorStatus.DOWN.value)
    paused_monitors = sum(1 for m in monitors if m.status == MonitorStatus.PAUSED.value)

    # 24h checks
    threshold_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    query_24h = db.query(CheckResult).filter(CheckResult.checked_at >= threshold_24h)

    total_checks_24h = query_24h.count()
    if total_checks_24h > 0:
        successful_24h = query_24h.filter(CheckResult.is_success == True).count()
        overall_uptime = round((successful_24h / total_checks_24h) * 100.0, 2)
        avg_agg = query_24h.with_entities(func.avg(CheckResult.response_time_ms)).scalar()
        avg_lat_24h = round(float(avg_agg), 2) if avg_agg is not None else None
    else:
        overall_uptime = None
        avg_lat_24h = None

    return DashboardOverview(
        total_monitors=total_monitors,
        healthy_monitors=healthy_monitors,
        down_monitors=down_monitors,
        paused_monitors=paused_monitors,
        overall_uptime_percentage=overall_uptime,
        total_checks_24h=total_checks_24h,
        avg_latency_24h=avg_lat_24h,
    )


def get_dashboard_latency_points(
    db: Session,
    range_str: str = "24h",
    limit: int = 200,
) -> List[LatencyDataPoint]:
    threshold = get_time_threshold(range_str)
    query = (
        db.query(
            CheckResult.checked_at,
            CheckResult.monitor_id,
            Monitor.name.label("monitor_name"),
            CheckResult.response_time_ms,
            CheckResult.is_success,
            CheckResult.status_code,
        )
        .join(Monitor, CheckResult.monitor_id == Monitor.id)
    )

    if threshold:
        query = query.filter(CheckResult.checked_at >= threshold)

    results = query.order_by(desc(CheckResult.checked_at)).limit(limit).all()
    # Reverse to return chronological order for charts
    points = [
        LatencyDataPoint(
            timestamp=r.checked_at,
            monitor_id=r.monitor_id,
            monitor_name=r.monitor_name,
            response_time_ms=round(r.response_time_ms, 2),
            is_success=r.is_success,
            status_code=r.status_code,
        )
        for r in reversed(results)
    ]
    return points


def get_dashboard_incidents(db: Session, limit: int = 20) -> List[IncidentRead]:
    results = (
        db.query(
            CheckResult.id,
            CheckResult.monitor_id,
            Monitor.name.label("monitor_name"),
            Monitor.url,
            CheckResult.checked_at,
            CheckResult.status_code,
            CheckResult.error_type,
            CheckResult.error_message,
        )
        .join(Monitor, CheckResult.monitor_id == Monitor.id)
        .filter(CheckResult.is_success == False)
        .order_by(desc(CheckResult.checked_at))
        .limit(limit)
        .all()
    )

    return [
        IncidentRead(
            id=r.id,
            monitor_id=r.monitor_id,
            monitor_name=r.monitor_name,
            url=r.url,
            checked_at=r.checked_at,
            status_code=r.status_code,
            error_type=r.error_type,
            error_message=r.error_message,
        )
        for r in results
    ]
