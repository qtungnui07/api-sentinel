"use client";

import { useState } from "react";
import { Plus, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onAddMonitor?: () => void;
}

export function DashboardHeader({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  onAddMonitor,
}: DashboardHeaderProps) {
  // Query backend health for connection indicator
  const { data: health, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.getHealth(),
    refetchInterval: 15000,
  });

  const isConnected = !isError && health?.status === "healthy";

  return (
    <header className="h-16 px-8 border-b border-border bg-sidebar/50 backdrop-blur flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-base font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Backend connection pill */}
        <div
          title={isConnected ? "Connected to Sentinel Backend" : "Disconnected from Backend"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
            isConnected
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px]">API ONLINE</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span className="text-[11px]">API OFFLINE</span>
            </>
          )}
        </div>

        {/* Refresh action */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-white hover:bg-card-hover rounded-lg border border-border transition-colors disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          </button>
        )}

        {/* Add monitor action */}
        {onAddMonitor && (
          <button
            onClick={onAddMonitor}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Monitor</span>
          </button>
        )}
      </div>
    </header>
  );
}
