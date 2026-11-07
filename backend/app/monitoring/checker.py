import asyncio
import time
from datetime import datetime, timezone
from typing import Optional, Set

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.monitor import CheckResult, HttpMethod, Monitor, MonitorStatus
from app.services.ssrf import SafeSSRFTransport, SSRFProtectionError, validate_and_resolve_url

settings = get_settings()

# Concurrency control & Overlap prevention
_running_checks: Set[str] = set()
_semaphore: Optional[asyncio.Semaphore] = None


def get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.max_concurrent_checks)
    return _semaphore


async def check_endpoint(
    url: str,
    method: str,
    timeout_seconds: int,
    expected_status_code: int,
) -> tuple[bool, Optional[int], float, Optional[str], Optional[str]]:
    """
    Executes a single secure HTTP check against the target endpoint.
    Returns: (is_success, status_code, response_time_ms, error_type, error_message)
    """
    start_time = time.perf_counter()

    # 1. SSRF Validation & DNS Pinning
    try:
        _, _, pinned_ip = validate_and_resolve_url(url)
    except SSRFProtectionError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return False, None, elapsed_ms, "SSRF_VIOLATION", str(e)
    except Exception:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return False, None, elapsed_ms, "SSRF_VIOLATION", "Invalid or forbidden destination"

    # 2. Secure HTTP Request with pinned IP
    sem = get_semaphore()
    async with sem:
        transport = SafeSSRFTransport(pinned_ip=pinned_ip)
        try:
            async with httpx.AsyncClient(
                transport=transport,
                timeout=httpx.Timeout(float(timeout_seconds)),
                follow_redirects=False,
                headers={"User-Agent": "API-Sentinel-Monitor/1.0"},
            ) as client:
                req_method = "HEAD" if method == HttpMethod.HEAD.value else "GET"
                # Using stream to avoid downloading full response bodies
                async with client.stream(req_method, url) as response:
                    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                    status_code = response.status_code

                    if status_code == expected_status_code:
                        return True, status_code, elapsed_ms, None, None
                    else:
                        return (
                            False,
                            status_code,
                            elapsed_ms,
                            "STATUS_MISMATCH",
                            f"Expected status {expected_status_code}, received {status_code}",
                        )

        except httpx.TimeoutException:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return False, None, elapsed_ms, "TIMEOUT", f"Request timed out after {timeout_seconds}s"
        except (httpx.ConnectError, httpx.NetworkError):
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return False, None, elapsed_ms, "CONNECTION_ERROR", "Failed to establish connection"
        except Exception:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return False, None, elapsed_ms, "HTTP_ERROR", "HTTP check encountered an error"


async def run_monitor_check(monitor_id: str) -> Optional[CheckResult]:
    """
    Coordinates check execution for a monitor, handles DB recording,
    and prevents overlapping checks.
    """
    if monitor_id in _running_checks:
        return None

    _running_checks.add(monitor_id)
    try:
        # Load monitor using independent DB session
        db: Session = SessionLocal()
        try:
            monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
            if not monitor or not monitor.is_active or monitor.status == MonitorStatus.PAUSED.value:
                return None

            url = monitor.url
            method = monitor.method
            timeout = monitor.timeout_seconds
            expected_code = monitor.expected_status_code
        finally:
            db.close()

        # Perform the async check
        is_success, status_code, response_time_ms, err_type, err_msg = await check_endpoint(
            url=url,
            method=method,
            timeout_seconds=timeout,
            expected_status_code=expected_code,
        )

        # Record check result and update monitor status
        db = SessionLocal()
        try:
            monitor = db.query(Monitor).filter(Monitor.id == monitor_id).first()
            if not monitor:
                return None

            now = datetime.now(timezone.utc)
            result = CheckResult(
                monitor_id=monitor.id,
                checked_at=now,
                response_time_ms=round(response_time_ms, 2),
                status_code=status_code,
                is_success=is_success,
                error_type=err_type,
                error_message=err_msg,
            )
            db.add(result)

            monitor.status = MonitorStatus.UP.value if is_success else MonitorStatus.DOWN.value
            monitor.last_checked_at = now
            db.commit()
            db.refresh(result)
            return result
        finally:
            db.close()

    finally:
        _running_checks.discard(monitor_id)
