"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Pause,
  Play,
  RotateCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MonitorStatusBadge } from "@/components/monitors/MonitorStatusBadge";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { EditMonitorDialog } from "@/components/monitors/EditMonitorDialog";
import { DeleteMonitorDialog } from "@/components/monitors/DeleteMonitorDialog";
import { formatDate, formatMs, formatUptime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { Monitor } from "@/types/monitor";

export default function MonitorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const monitorId = params.id as string;

  const [range, setRange] = useState("24h");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Queries
  const { data: monitor, isLoading: isLoadingMonitor, refetch: refetchMonitor } = useQuery({
    queryKey: ["monitor", monitorId],
    queryFn: () => api.getMonitor(monitorId),
    refetchInterval: 10000,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["monitor-stats", monitorId, range],
    queryFn: () => api.getMonitorStats(monitorId, range),
    refetchInterval: 10000,
  });

  const { data: history = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["monitor-history", monitorId, range],
    queryFn: () => api.getMonitorHistory(monitorId, range),
    refetchInterval: 10000,
  });

  // Mutations
  const pauseMutation = useMutation({
    mutationFn: () => api.pauseMonitor(monitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitor", monitorId] });
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeMonitor(monitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitor", monitorId] });
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteMonitor(monitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      router.push("/monitors");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateMonitor(monitorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitor", monitorId] });
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    },
  });

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      await api.checkMonitorNow(monitorId);
      refetchMonitor();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["monitor-stats", monitorId] });
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoadingMonitor) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="p-8 text-center text-slate-400">
        Monitor not found.{" "}
        <Link href="/monitors" className="text-blue-400 hover:underline">
          Return to monitors
        </Link>
      </div>
    );
  }

  // Format latency data points for chart
  const latencyData = history.map((h) => ({
    timestamp: h.checked_at,
    monitor_id: h.monitor_id,
    monitor_name: monitor.name,
    response_time_ms: h.response_time_ms,
    is_success: h.is_success,
    status_code: h.status_code,
  })).reverse();

  return (
    <div className="flex-1 pb-16">
      <DashboardHeader
        title={monitor.name}
        subtitle={monitor.url}
        onRefresh={() => {
          refetchMonitor();
          refetchHistory();
        }}
      />

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/monitors"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Monitors</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckNow}
              disabled={isChecking || monitor.status === "PAUSED"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-border transition-colors disabled:opacity-40"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin text-blue-400" : ""}`} />
              <span>Run Check Now</span>
            </button>

            {monitor.status === "PAUSED" ? (
              <button
                onClick={() => resumeMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={() => pauseMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-border transition-colors"
              title="Edit monitor"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsDeleting(true)}
              className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg border border-border transition-colors"
              title="Delete monitor"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Overview Banner */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <span className="text-xs text-slate-400">Operational Status</span>
              <div className="mt-2 flex items-center gap-2">
                <MonitorStatusBadge status={monitor.status} />
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Port {monitor.url.startsWith("https") ? 443 : 80} pinned</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400">Check-Based Uptime ({range})</span>
              <div className="mt-1 text-2xl font-bold font-mono text-white">
                {formatUptime(stats?.uptime_percentage)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {stats?.successful_checks ?? 0} passed / {stats?.total_checks ?? 0} total
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400">Average Latency</span>
              <div className="mt-1 text-2xl font-bold font-mono text-white">
                {formatMs(stats?.avg_response_time_ms)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Min: {formatMs(stats?.min_response_time_ms)} | Max: {formatMs(stats?.max_response_time_ms)}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400">Schedule Details</span>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                Every {monitor.interval_seconds}s
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Timeout: {monitor.timeout_seconds}s | Expect: {monitor.expected_status_code}
              </div>
            </div>
          </div>
        </div>

        {/* Latency History Chart */}
        <LatencyChart
          data={latencyData}
          range={range}
          onRangeChange={setRange}
          title={`Response Time Trends (${range})`}
        />

        {/* Recent Checks Table */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div>
              <h3 className="text-sm font-semibold text-white">Execution History</h3>
              <p className="text-xs text-slate-400">Latest completed health checks</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-border text-slate-400">
              {history.length} checks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">HTTP Status</th>
                  <th className="py-2.5 px-3">Response Time</th>
                  <th className="py-2.5 px-3">Details / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No check history recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((check) => (
                    <tr key={check.id} className="hover:bg-slate-900/40 font-mono">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(check.checked_at)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {check.is_success ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-sans font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-sans font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {check.status_code ? (
                          <span
                            className={
                              check.status_code === monitor.expected_status_code
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {check.status_code}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap">
                        {check.response_time_ms} ms
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                        {check.error_type ? (
                          <span className="text-rose-400">
                            [{check.error_type}] {check.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-500">Normal check</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <EditMonitorDialog
        monitor={monitor}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSubmit={async (id, data) => {
          await updateMutation.mutateAsync(data);
        }}
      />

      <DeleteMonitorDialog
        monitor={monitor}
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
