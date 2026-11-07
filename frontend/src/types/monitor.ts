export type MonitorStatus = "UP" | "DOWN" | "PAUSED" | "PENDING";
export type HttpMethod = "GET" | "HEAD";

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  interval_seconds: number;
  timeout_seconds: number;
  expected_status_code: number;
  status: MonitorStatus;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  uptime_percentage?: number | null;
  avg_response_time_ms?: number | null;
}

export interface MonitorCreateInput {
  name: string;
  url: string;
  method: HttpMethod;
  interval_seconds: number;
  timeout_seconds: number;
  expected_status_code: number;
}

export interface MonitorUpdateInput {
  name?: string;
  url?: string;
  method?: HttpMethod;
  interval_seconds?: number;
  timeout_seconds?: number;
  expected_status_code?: number;
}

export interface CheckResult {
  id: string;
  monitor_id: string;
  checked_at: string;
  response_time_ms: number;
  status_code: number | null;
  is_success: boolean;
  error_type: string | null;
  error_message: string | null;
}

export interface MonitorStats {
  monitor_id: string;
  uptime_percentage: number | null;
  avg_response_time_ms: number | null;
  min_response_time_ms: number | null;
  max_response_time_ms: number | null;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  last_successful_check: string | null;
}

export interface DashboardOverview {
  total_monitors: number;
  healthy_monitors: number;
  down_monitors: number;
  paused_monitors: number;
  overall_uptime_percentage: number | null;
  total_checks_24h: number;
  avg_latency_24h: number | null;
}

export interface LatencyDataPoint {
  timestamp: string;
  monitor_id: string;
  monitor_name: string;
  response_time_ms: number;
  is_success: boolean;
  status_code: number | null;
}

export interface Incident {
  id: string;
  monitor_id: string;
  monitor_name: string;
  url: string;
  checked_at: string;
  status_code: number | null;
  error_type: string | null;
  error_message: string | null;
}
