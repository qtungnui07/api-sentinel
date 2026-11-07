"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import Link from "next/link";

export default function IncidentsPage() {
  const { data: incidents = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["all-incidents"],
    queryFn: () => api.getDashboardIncidents(100),
    refetchInterval: 10000,
  });

  return (
    <div className="flex-1 pb-16">
      <DashboardHeader
        title="Incident Logs"
        subtitle="Chronological feed of failed checks, connection timeouts, and status mismatches"
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-72" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Zero Incidents</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              All monitored endpoints are operating smoothly. No outages or connection errors recorded.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-white">Recent Failures</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {incidents.length} incidents logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 uppercase tracking-wider text-slate-400 border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Monitor</th>
                    <th className="py-3 px-4 font-semibold">Error Type</th>
                    <th className="py-3 px-4 font-semibold">HTTP Code</th>
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4">
                        <Link
                          href={`/monitors/${incident.monitor_id}`}
                          className="font-medium text-white hover:text-blue-400 transition-colors"
                        >
                          {incident.monitor_name}
                        </Link>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs">
                          {incident.url}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {incident.error_type || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        {incident.status_code ? (
                          <span className="text-amber-400">HTTP {incident.status_code}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                        {formatDate(incident.checked_at)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono max-w-sm truncate">
                        {incident.error_message || "Target endpoint unreachable"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
