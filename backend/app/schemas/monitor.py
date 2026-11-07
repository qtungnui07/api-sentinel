from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.monitor import HttpMethod, MonitorStatus


class MonitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Monitor display name")
    url: str = Field(..., max_length=2048, description="Target HTTP/HTTPS URL")
    method: HttpMethod = Field(default=HttpMethod.GET, description="HTTP check method")
    interval_seconds: int = Field(default=60, description="Check interval in seconds (30, 60, or 300)")
    timeout_seconds: int = Field(default=10, ge=1, le=60, description="Request timeout in seconds")
    expected_status_code: int = Field(default=200, ge=100, le=599, description="Expected HTTP response status")

    @field_validator("interval_seconds")
    @classmethod
    def validate_interval(cls, v: int) -> int:
        if v not in (30, 60, 300):
            raise ValueError("interval_seconds must be one of: 30, 60, 300")
        return v

    @field_validator("url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        v_stripped = v.strip()
        if not (v_stripped.startswith("http://") or v_stripped.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")
        return v_stripped


class MonitorCreate(MonitorBase):
    pass


class MonitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    url: Optional[str] = Field(None, max_length=2048)
    method: Optional[HttpMethod] = None
    interval_seconds: Optional[int] = None
    timeout_seconds: Optional[int] = Field(None, ge=1, le=60)
    expected_status_code: Optional[int] = Field(None, ge=100, le=599)

    @field_validator("interval_seconds")
    @classmethod
    def validate_interval(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in (30, 60, 300):
            raise ValueError("interval_seconds must be one of: 30, 60, 300")
        return v

    @field_validator("url")
    @classmethod
    def validate_url_scheme(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_stripped = v.strip()
            if not (v_stripped.startswith("http://") or v_stripped.startswith("https://")):
                raise ValueError("URL must start with http:// or https://")
            return v_stripped
        return v


class MonitorRead(MonitorBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: MonitorStatus
    is_active: bool
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    uptime_percentage: Optional[float] = None
    avg_response_time_ms: Optional[float] = None


class CheckResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    monitor_id: str
    checked_at: datetime
    response_time_ms: float
    status_code: Optional[int] = None
    is_success: bool
    error_type: Optional[str] = None
    error_message: Optional[str] = None


class MonitorStats(BaseModel):
    monitor_id: str
    uptime_percentage: Optional[float] = None
    avg_response_time_ms: Optional[float] = None
    min_response_time_ms: Optional[float] = None
    max_response_time_ms: Optional[float] = None
    total_checks: int = 0
    successful_checks: int = 0
    failed_checks: int = 0
    last_successful_check: Optional[datetime] = None


class DashboardOverview(BaseModel):
    total_monitors: int = 0
    healthy_monitors: int = 0
    down_monitors: int = 0
    paused_monitors: int = 0
    overall_uptime_percentage: Optional[float] = None
    total_checks_24h: int = 0
    avg_latency_24h: Optional[float] = None


class LatencyDataPoint(BaseModel):
    timestamp: datetime
    monitor_id: str
    monitor_name: str
    response_time_ms: float
    is_success: bool
    status_code: Optional[int] = None


class IncidentRead(BaseModel):
    id: str
    monitor_id: str
    monitor_name: str
    url: str
    checked_at: datetime
    status_code: Optional[int] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
