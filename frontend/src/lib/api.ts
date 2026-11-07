import {
  CheckResult,
  DashboardOverview,
  Incident,
  LatencyDataPoint,
  Monitor,
  MonitorCreateInput,
  MonitorStats,
  MonitorUpdateInput,
} from "@/types/monitor";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred";
    try {
      const data = await response.json();
      errorDetail = data.detail || JSON.stringify(data);
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  // System Health
  async getHealth(): Promise<{ status: string; scheduler_running: boolean }> {
    return request("/health");
  },

  // Dashboard
  async getDashboardOverview(): Promise<DashboardOverview> {
    return request("/api/v1/dashboard/overview");
  },

  async getDashboardLatency(range = "24h"): Promise<LatencyDataPoint[]> {
    return request(`/api/v1/dashboard/latency?range=${range}&limit=200`);
  },

  async getDashboardIncidents(limit = 20): Promise<Incident[]> {
    return request(`/api/v1/dashboard/incidents?limit=${limit}`);
  },

  // Monitors
  async listMonitors(): Promise<Monitor[]> {
    return request("/api/v1/monitors");
  },

  async getMonitor(id: string): Promise<Monitor> {
    return request(`/api/v1/monitors/${id}`);
  },

  async createMonitor(input: MonitorCreateInput): Promise<Monitor> {
    return request("/api/v1/monitors", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateMonitor(id: string, input: MonitorUpdateInput): Promise<Monitor> {
    return request(`/api/v1/monitors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async deleteMonitor(id: string): Promise<void> {
    return request(`/api/v1/monitors/${id}`, {
      method: "DELETE",
    });
  },

  async pauseMonitor(id: string): Promise<Monitor> {
    return request(`/api/v1/monitors/${id}/pause`, {
      method: "POST",
    });
  },

  async resumeMonitor(id: string): Promise<Monitor> {
    return request(`/api/v1/monitors/${id}/resume`, {
      method: "POST",
    });
  },

  async checkMonitorNow(id: string): Promise<CheckResult> {
    return request(`/api/v1/monitors/${id}/check`, {
      method: "POST",
    });
  },

  async getMonitorHistory(id: string, range = "24h"): Promise<CheckResult[]> {
    return request(`/api/v1/monitors/${id}/history?range=${range}&limit=100`);
  },

  async getMonitorStats(id: string, range = "24h"): Promise<MonitorStats> {
    return request(`/api/v1/monitors/${id}/stats?range=${range}`);
  },
};
