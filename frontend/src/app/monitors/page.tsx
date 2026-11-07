"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Radio, Search } from "lucide-react";

import { api } from "@/lib/api";
import { Monitor, MonitorCreateInput, MonitorUpdateInput } from "@/types/monitor";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MonitorTable } from "@/components/monitors/MonitorTable";
import { AddMonitorDialog } from "@/components/monitors/AddMonitorDialog";
import { EditMonitorDialog } from "@/components/monitors/EditMonitorDialog";
import { DeleteMonitorDialog } from "@/components/monitors/DeleteMonitorDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/LoadingSkeleton";

export default function MonitorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [deletingMonitor, setDeletingMonitor] = useState<Monitor | null>(null);

  const { data: monitors = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["monitors"],
    queryFn: () => api.listMonitors(),
    refetchInterval: 10000,
  });

  const filteredMonitors = useMemo(() => {
    return monitors.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.url.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [monitors, search, statusFilter]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: MonitorCreateInput) => api.createMonitor(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MonitorUpdateInput }) =>
      api.updateMonitor(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMonitor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseMonitor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeMonitor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const checkNowMutation = useMutation({
    mutationFn: (id: string) => api.checkMonitorNow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  return (
    <div className="flex-1 pb-16">
      <DashboardHeader
        title="Monitors Management"
        subtitle="Manage endpoints, scheduling intervals, and status alerts"
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
        onAddMonitor={() => setIsAddOpen(true)}
      />

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or URL..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-border p-1 rounded-lg text-xs">
            {["ALL", "UP", "DOWN", "PAUSED", "PENDING"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-64" />
          </div>
        ) : filteredMonitors.length === 0 ? (
          <EmptyState
            icon={Radio}
            title={monitors.length === 0 ? "No monitors configured" : "No matching monitors"}
            description={
              monitors.length === 0
                ? "Add your first HTTP/HTTPS target to initiate automated scheduled checks."
                : "No monitors match your current search and filter criteria."
            }
            action={
              monitors.length === 0 ? (
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Create Monitor
                </button>
              ) : undefined
            }
          />
        ) : (
          <MonitorTable
            monitors={filteredMonitors}
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
