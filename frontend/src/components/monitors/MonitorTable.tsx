"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Edit2,
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Monitor } from "@/types/monitor";
import { MonitorStatusBadge } from "./MonitorStatusBadge";
import { formatDate, formatMs, formatUptime } from "@/lib/utils";

interface MonitorTableProps {
  monitors: Monitor[];
  onCheckNow: (id: string) => Promise<void>;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onEdit: (monitor: Monitor) => void;
  onDelete: (monitor: Monitor) => void;
}

export function MonitorTable({
  monitors,
  onCheckNow,
  onPause,
  onResume,
  onEdit,
  onDelete,
}: MonitorTableProps) {
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleCheck = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCheckingId(id);
    try {
      await onCheckNow(id);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 border-b border-border">
          <tr>
            <th className="py-3.5 px-4 font-semibold">Monitor</th>
            <th className="py-3.5 px-4 font-semibold">Status</th>
            <th className="py-3.5 px-4 font-semibold">Uptime (24h)</th>
            <th className="py-3.5 px-4 font-semibold">Avg Latency</th>
            <th className="py-3.5 px-4 font-semibold">Last Checked</th>
            <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {monitors.map((m) => (
            <tr
              key={m.id}
              className="hover:bg-card-hover/80 transition-colors group"
            >
              <td className="py-3.5 px-4">
                <Link
                  href={`/monitors/${m.id}`}
                  className="font-medium text-white hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                >
                  <span>{m.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono truncate max-w-xs md:max-w-md">
                  <span className="px-1.5 py-0.2 bg-slate-800 rounded text-[10px] text-slate-400">
                    {m.method}
                  </span>
                  <span className="truncate">{m.url}</span>
                </div>
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap">
                <MonitorStatusBadge status={m.status} />
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                <span
                  className={
                    m.uptime_percentage && m.uptime_percentage >= 99
                      ? "text-emerald-400"
                      : m.uptime_percentage && m.uptime_percentage >= 95
                      ? "text-amber-400"
                      : m.uptime_percentage
                      ? "text-rose-400"
                      : "text-slate-500"
                  }
                >
                  {formatUptime(m.uptime_percentage)}
                </span>
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300">
                {formatMs(m.avg_response_time_ms)}
              </td>
              <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400">
                {formatDate(m.last_checked_at)}
              </td>
              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => handleCheck(m.id, e)}
                    disabled={checkingId === m.id || m.status === "PAUSED"}
                    title="Check Now"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <RotateCw
                      className={`w-3.5 h-3.5 ${checkingId === m.id ? "animate-spin text-blue-400" : ""}`}
                    />
                  </button>

                  {m.status === "PAUSED" ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onResume(m.id);
                      }}
                      title="Resume Monitoring"
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onPause(m.id);
                      }}
                      title="Pause Monitoring"
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit(m);
                    }}
                    title="Edit Monitor"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(m);
                    }}
                    title="Delete Monitor"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
