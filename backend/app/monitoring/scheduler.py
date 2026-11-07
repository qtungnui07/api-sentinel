import asyncio
import logging
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.monitor import Monitor, MonitorStatus
from app.monitoring.checker import run_monitor_check

logger = logging.getLogger("sentinel.scheduler")

scheduler: Optional[AsyncIOScheduler] = None
_main_loop: Optional[asyncio.AbstractEventLoop] = None


def get_job_id(monitor_id: str) -> str:
    return f"monitor_job_{monitor_id}"


def get_scheduler() -> AsyncIOScheduler:
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler(timezone="UTC")
    return scheduler


def schedule_monitor(monitor_id: str, interval_seconds: int, trigger_immediately: bool = True):
    sched = get_scheduler()
    job_id = get_job_id(monitor_id)

    # Schedule recurring interval
    sched.add_job(
        run_monitor_check,
        trigger="interval",
        seconds=interval_seconds,
        id=job_id,
        args=[monitor_id],
        replace_existing=True,
        max_instances=1,
    )
    logger.info(f"Scheduled monitor {monitor_id} every {interval_seconds}s")

    if trigger_immediately:
        if _main_loop and _main_loop.is_running():
            asyncio.run_coroutine_threadsafe(run_monitor_check(monitor_id), _main_loop)
        else:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(run_monitor_check(monitor_id))
            except RuntimeError:
                pass


def unschedule_monitor(monitor_id: str):
    sched = get_scheduler()
    job_id = get_job_id(monitor_id)
    if sched.get_job(job_id):
        sched.remove_job(job_id)
        logger.info(f"Unscheduled monitor {monitor_id}")


def start_scheduler():
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        _main_loop = None

    sched = get_scheduler()
    if not sched.running:
        sched.start()
        logger.info("Sentinel scheduler started")

    # Load and resume active monitors from DB
    db: Session = SessionLocal()
    try:
        active_monitors = (
            db.query(Monitor)
            .filter(
                Monitor.is_active == True,
                Monitor.status != MonitorStatus.PAUSED.value,
            )
            .all()
        )
        for m in active_monitors:
            schedule_monitor(m.id, m.interval_seconds, trigger_immediately=True)
        logger.info(f"Loaded and scheduled {len(active_monitors)} active monitors from database.")
    except Exception as e:
        logger.error(f"Failed to load active monitors on scheduler startup: {e}")
    finally:
        db.close()


def shutdown_scheduler():
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Sentinel scheduler shut down")
