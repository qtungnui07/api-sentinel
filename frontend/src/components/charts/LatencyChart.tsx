"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LatencyDataPoint } from "@/types/monitor";
import { Activity } from "lucide-react";

interface LatencyChartProps {
  data: LatencyDataPoint[];
  title?: string;
  range: string;
  onRangeChange?: (range: string) => void;
}

export function LatencyChart({
  data,
  title = "Response Time History",
  range,
  onRangeChange,
}: LatencyChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => {
      const date = new Date(d.timestamp);
      return {
        ...d,
        timeLabel: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        latency: d.response_time_ms,
      };
    });
  }, [data]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border/80 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-400">Endpoint latency trends measured in milliseconds</p>
          </div>
        </div>

        {onRangeChange && (
          <div className="flex items-center bg-slate-900 border border-border rounded-lg p-0.5 text-xs">
            {["1h", "24h", "7d"].map((r) => (
              <button
                key={r}
                onClick={() => onRangeChange(r)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  range === r
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No check data recorded for this time range yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#1E293B" }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#1E293B" }}
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as LatencyDataPoint & { timeLabel: string };
                    return (
                      <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs space-y-1">
                        <div className="font-semibold text-white">{item.monitor_name}</div>
                        <div className="text-slate-400">{item.timeLabel}</div>
                        <div className="flex items-center gap-2 pt-1 font-mono">
                          <span className="text-blue-400 font-bold">
                            {item.response_time_ms} ms
                          </span>
                          <span
                            className={
                              item.is_success ? "text-emerald-400" : "text-rose-400 font-bold"
                            }
                          >
                            {item.status_code ? `HTTP ${item.status_code}` : "FAILED"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
