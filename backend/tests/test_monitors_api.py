import pytest
from app.models.monitor import CheckResult, Monitor, MonitorStatus


def test_create_monitor_success(client, monkeypatch):
    def mock_getaddrinfo(host, port, type=None):
        return [(2, 1, 6, "", ("93.184.216.34", port))]

    monkeypatch.setattr("socket.getaddrinfo", mock_getaddrinfo)

    payload = {
        "name": "Example API",
        "url": "https://example.com/health",
        "method": "GET",
        "interval_seconds": 60,
        "timeout_seconds": 10,
        "expected_status_code": 200,
    }
    response = client.post("/api/v1/monitors", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Example API"
    assert data["url"] == "https://example.com/health"
    assert data["status"] == "PENDING"
    assert data["is_active"] is True
    assert "id" in data


def test_create_monitor_invalid_url(client):
    payload = {
        "name": "Bad URL API",
        "url": "not-a-valid-url",
        "interval_seconds": 60,
    }
    response = client.post("/api/v1/monitors", json=payload)
    assert response.status_code == 422


def test_create_monitor_blocks_private_destinations(client):
    payload = {
        "name": "Localhost API",
        "url": "http://127.0.0.1:80/internal",
        "interval_seconds": 60,
    }
    response = client.post("/api/v1/monitors", json=payload)
    assert response.status_code == 400
    assert "Security check failed" in response.json()["detail"]


def test_pause_and_resume_monitor(client, monkeypatch):
    monkeypatch.setattr(
        "socket.getaddrinfo",
        lambda host, port, type=None: [(2, 1, 6, "", ("93.184.216.34", port))],
    )

    create_res = client.post(
        "/api/v1/monitors",
        json={"name": "Pause Test", "url": "https://example.com", "interval_seconds": 30},
    )
    monitor_id = create_res.json()["id"]

    # Pause
    pause_res = client.post(f"/api/v1/monitors/{monitor_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == MonitorStatus.PAUSED.value

    # Resume
    resume_res = client.post(f"/api/v1/monitors/{monitor_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == MonitorStatus.PENDING.value


def test_delete_monitor_and_cascade_history(client, db_session, monkeypatch):
    monkeypatch.setattr(
        "socket.getaddrinfo",
        lambda host, port, type=None: [(2, 1, 6, "", ("93.184.216.34", port))],
    )

    create_res = client.post(
        "/api/v1/monitors",
        json={"name": "Delete Test", "url": "https://example.com"},
    )
    monitor_id = create_res.json()["id"]

    # Add check results directly
    res1 = CheckResult(
        monitor_id=monitor_id,
        response_time_ms=120.5,
        status_code=200,
        is_success=True,
    )
    db_session.add(res1)
    db_session.commit()

    assert db_session.query(CheckResult).filter(CheckResult.monitor_id == monitor_id).count() == 1

    # Delete monitor
    del_res = client.delete(f"/api/v1/monitors/{monitor_id}")
    assert del_res.status_code == 204

    # Verify monitor and associated check results are deleted
    assert db_session.query(Monitor).filter(Monitor.id == monitor_id).first() is None
    assert db_session.query(CheckResult).filter(CheckResult.monitor_id == monitor_id).count() == 0
