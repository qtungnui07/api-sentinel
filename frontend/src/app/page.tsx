"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Server,
  Zap,
} from "lucide-react";

import { api } from "@/lib/api";
import { Monitor, MonitorCreateInput, MonitorUpdateInput } from "@/types/monitor";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonitorTable } from "@/components/monitors/MonitorTable";
import { LatencyChart } from "@/components/charts/LatencyChart";
import { IncidentList } from "@/components/dashboard/IncidentList";
import { AddMonitorDialog } from "@/components/monitors/AddMonitorDialog";
import { EditMonitorDialog } from "@/components/monitors/EditMonitorDialog";
import { DeleteMonitorDialog } from "@/components/monitors/DeleteMonitorDialog";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatUptime } from "@/lib/utils";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [latencyRange, setLatencyRange] = useState("24h");

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [deletingMonitor, setDeletingMonitor] = useState<Monitor | null>(null);

  // Queries (polled every 10 seconds)
  const {
    data: overview,
    isLoading: isLoadingOverview,
    refetch: refetchOverview,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => api.getDashboardOverview(),
    refetchInterval: 10000,
  });

  const {
    data: monitors = [],
    isLoading: isLoadingMonitors,
    refetch: refetchMonitors,
  } = useQuery({
    queryKey: ["monitors"],
    queryFn: () => api.listMonitors(),
    refetchInterval: 10000,
  });

  const {
    data: latencyData = [],
    isLoading: isLoadingLatency,
    refetch: refetchLatency,
  } = useQuery({
    queryKey: ["dashboard-latency", latencyRange],
    queryFn: () => api.getDashboardLatency(latencyRange),
    refetchInterval: 10000,
  });

  const {
    data: incidents = [],
    isLoading: isLoadingIncidents,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ["dashboard-incidents"],
    queryFn: () => api.getDashboardIncidents(20),
    refetchInterval: 10000,
  });

  const refreshAll = () => {
    refetchOverview();
    refetchMonitors();
    refetchLatency();
    refetchIncidents();
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: MonitorCreateInput) => api.createMonitor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-latency"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MonitorUpdateInput }) =>
      api.updateMonitor(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMonitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-latency"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-incidents"] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseMonitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeMonitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
  });

  const checkNowMutation = useMutation({
    mutationFn: (id: string) => api.checkMonitorNow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-latency"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-incidents"] });
    },
  });

  const isLoading = isLoadingOverview && isLoadingMonitors;

  return (
    <div className="flex-1 pb-16">
      <DashboardHeader
        title="Dashboard Overview"
        subtitle="Real-time availability and latency metrics across all endpoints"
        onRefresh={refreshAll}
        isRefreshing={isRefetching}
        onAddMonitor={() => setIsAddOpen(true)}
      />

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Monitors"
                value={overview?.total_monitors ?? 0}
                subtitle={`${overview?.paused_monitors ?? 0} paused`}
                icon={Server}
                variant="default"
              />
              <StatCard
                title="Healthy Monitors"
                value={overview?.healthy_monitors ?? 0}
                subtitle="Currently passing checks"
                icon={CheckCircle2}
                variant="success"
              />
              <StatCard
                title="Down Monitors"
                value={overview?.down_monitors ?? 0}
                subtitle="Failing or degraded"
                icon={AlertTriangle}
                variant={overview?.down_monitors ? "danger" : "default"}
              />
              <StatCard
                title="Check-based Uptime"
                value={formatUptime(overview?.overall_uptime_percentage)}
                subtitle={`${overview?.total_checks_24h ?? 0} checks in 24h`}
                icon={Zap}
                variant={
                  overview?.overall_uptime_percentage &&
                  overview.overall_uptime_percentage >= 99
                    ? "success"
                    : "warning"
                }
              />
            </div>

            {/* Performance Latency Chart */}
            <LatencyChart
              data={latencyData}
              range={latencyRange}
              onRangeChange={setLatencyRange}
            />

            {/* Two-column layout: Monitor Table & Recent Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">Monitored Endpoints</h2>
                  <span className="text-xs text-slate-400">
                    Auto-refreshes every 10s
                  </span>
                </div>

                {monitors.length === 0 ? (
                  <EmptyState
                    icon={Radio}
                    title="No monitors yet"
                    description="Get started by configuring your first HTTP or HTTPS endpoint for automated uptime monitoring."
                    action={
                      <button
                        onClick={() => setIsAddOpen(true)}
                        className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        Add Your First Monitor
                      </button>
                    }
                  />
                ) : (
                  <MonitorTable
                    monitors={monitors}
                    onCheckNow={async (id) => {
                      await checkNowMutation.mutateAsync(id);
                    }}
                    onPause={async (id) => {
                      await pauseMutation.mutateAsync(id);
                    }}
                    onResume={async (id) => {
                      await resumeMutation.mutateAsync(id);
                    }}
                    onEdit={(m) => setEditingMonitor(m)}
                    onDelete={(m) => setDeletingMonitor(m)}
                  />
                )}
              </div>

              {/* Incidents column */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-white">Incidents Log</h2>
                <IncidentList incidents={incidents} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <AddMonitorDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
        }}
      />

      <EditMonitorDialog
        monitor={editingMonitor}
        isOpen={!!editingMonitor}
        onClose={() => setEditingMonitor(null)}
        onSubmit={async (id, data) => {
          await updateMutation.mutateAsync({ id, input: data });
        }}
      />

      <DeleteMonitorDialog
        monitor={deletingMonitor}
        isOpen={!!deletingMonitor}
        onClose={() => setDeletingMonitor(null)}
        onConfirm={async (id) => {
          await deleteMutation.mutateAsync(id);
        }}
      />
    </div>
  );
}
