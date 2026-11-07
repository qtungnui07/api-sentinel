import asyncio
import pytest
from unittest.mock import AsyncMock, patch

from app.db.session import Base
from app.models.monitor import CheckResult, Monitor, MonitorStatus
from app.monitoring.checker import check_endpoint, run_monitor_check, _running_checks
from app.services.stats import calculate_monitor_stats, calculate_dashboard_overview


@pytest.mark.asyncio
async def test_check_endpoint_timeout(monkeypatch):
    # Mock SSRF validation to return safe pinned IP
    monkeypatch.setattr(
        "app.monitoring.checker.validate_and_resolve_url",
        lambda url: ("example.com", 443, "93.184.216.34"),
    )

    from contextlib import asynccontextmanager
    import httpx

    @asynccontextmanager
    async def mock_stream(*args, **kwargs):
        raise httpx.TimeoutException("Connection timed out")
        yield

    monkeypatch.setattr(httpx.AsyncClient, "stream", mock_stream)

    is_success, status_code, elapsed_ms, err_type, err_msg = await check_endpoint(
        url="https://example.com/slow",
        method="GET",
        timeout_seconds=5,
        expected_status_code=200,
    )

    assert is_success is False
    assert status_code is None
    assert err_type == "TIMEOUT"
    assert "timed out" in err_msg


@pytest.mark.asyncio
async def test_check_endpoint_status_mismatch(monkeypatch):
    monkeypatch.setattr(
        "app.monitoring.checker.validate_and_resolve_url",
        lambda url: ("example.com", 443, "93.184.216.34"),
    )

    import httpx

    class MockResponse:
        status_code = 500

    class MockStreamContext:
        async def __aenter__(self):
            return MockResponse()

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    monkeypatch.setattr(
        httpx.AsyncClient,
        "stream",
        lambda self, method, url: MockStreamContext(),
    )

    is_success, status_code, elapsed_ms, err_type, err_msg = await check_endpoint(
        url="https://example.com/error",
        method="GET",
        timeout_seconds=5,
        expected_status_code=200,
    )

    assert is_success is False
    assert status_code == 500
    assert err_type == "STATUS_MISMATCH"
    assert "Expected status 200, received 500" in err_msg


def test_uptime_calculation_and_empty_history(db_session):
    monitor = Monitor(
        name="Stats Test",
        url="https://example.com",
        method="GET",
        interval_seconds=60,
        status=MonitorStatus.PENDING.value,
    )
    db_session.add(monitor)
    db_session.commit()

    # 1. Test empty monitoring history
    stats_empty = calculate_monitor_stats(db_session, monitor.id)
    assert stats_empty.total_checks == 0
    assert stats_empty.uptime_percentage is None
    assert stats_empty.avg_response_time_ms is None

    # 2. Add 3 successful and 1 failed check
    checks = [
        CheckResult(monitor_id=monitor.id, response_time_ms=100.0, status_code=200, is_success=True),
        CheckResult(monitor_id=monitor.id, response_time_ms=150.0, status_code=200, is_success=True),
        CheckResult(monitor_id=monitor.id, response_time_ms=200.0, status_code=200, is_success=True),
        CheckResult(monitor_id=monitor.id, response_time_ms=300.0, status_code=500, is_success=False, error_type="STATUS_MISMATCH"),
    ]
    db_session.add_all(checks)
    db_session.commit()

    stats = calculate_monitor_stats(db_session, monitor.id)
    assert stats.total_checks == 4
    assert stats.successful_checks == 3
    assert stats.failed_checks == 1
    # 3 / 4 * 100 = 75.0%
    assert stats.uptime_percentage == 75.0
    # Avg: (100+150+200+300)/4 = 187.5
    assert stats.avg_response_time_ms == 187.5
    assert stats.min_response_time_ms == 100.0
    assert stats.max_response_time_ms == 300.0


@pytest.mark.asyncio
async def test_prevent_overlapping_checks():
    monitor_id = "test-overlapping-monitor"
    _running_checks.add(monitor_id)
    try:
        # Calling run_monitor_check while in _running_checks must return None immediately
        result = await run_monitor_check(monitor_id)
        assert result is None
    finally:
        _running_checks.discard(monitor_id)
