"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Info, Lock, Server, ShieldCheck, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function SettingsPage() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.getHealth(),
  });

  return (
    <div className="flex-1 pb-16">
      <DashboardHeader
        title="System & Security Settings"
        subtitle="Configuration, SSRF defense rules, and uptime calculation methodology"
      />

      <div className="px-8 py-6 max-w-4xl space-y-6">
        {/* Backend Status Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Service Health</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3 bg-slate-900 border border-border rounded-lg">
              <span className="text-[11px] text-slate-400 block">Backend Status</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {health?.status ? health.status.toUpperCase() : "CHECKING..."}
              </span>
            </div>
            <div className="p-3 bg-slate-900 border border-border rounded-lg">
              <span className="text-[11px] text-slate-400 block">Scheduler Engine</span>
              <span className="text-xs font-semibold text-white font-mono mt-1 block">
                APScheduler (AsyncIO)
              </span>
            </div>
            <div className="p-3 bg-slate-900 border border-border rounded-lg">
              <span className="text-[11px] text-slate-400 block">OpenAPI Specs</span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1 mt-1"
              >
                <span>/docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* SSRF Protection Specification */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">SSRF Defense Rules</h3>
          </div>
          <p className="text-xs text-slate-400">
            API Sentinel implements strict defense-in-depth against Server-Side Request Forgery (SSRF)
            and DNS rebinding attacks:
          </p>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Strict Scheme & Port Enforcement:</strong> Only <code className="text-blue-400">http://</code> and <code className="text-blue-400">https://</code> schemes with outbound ports restricted exclusively to <strong>80</strong> and <strong>443</strong> are permitted.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Comprehensive IP Range Blocking:</strong> Loopback (127.0.0.0/8, ::1), private subnets (RFC 1918), link-local, carrier-grade NAT (100.64.0.0/10), multicast, broadcast, and IPv4-mapped IPv6 ranges are blocked.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Cloud Metadata Shield:</strong> Hardened against AWS/GCP/Azure/Alibaba metadata endpoints (e.g. <code className="text-amber-400">169.254.169.254</code>, <code className="text-amber-400">metadata.google.internal</code>).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>DNS Rebinding Protection (IP Pinning):</strong> All resolved IP addresses are pre-validated before any connection. The socket stream is pinned directly to the validated IP while preserving TLS SNI verification.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Disabled Redirects & Bounded Streams:</strong> HTTP redirects are strictly disabled to prevent bounce attacks. Responses are streamed without saving arbitrary response bodies to RAM.
              </span>
            </li>
          </ul>
        </div>

        {/* Methodology Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Uptime Calculation Methodology</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Uptime percentages in API Sentinel are calculated strictly based on completed monitoring checks:
          </p>
          <div className="p-3 bg-slate-900 border border-border rounded-lg font-mono text-xs text-slate-300">
            Uptime (%) = (Successful Completed Checks / Total Completed Checks) × 100
          </div>
          <p className="text-[11px] text-slate-500">
            Note: This metric reflects check-based availability during active monitoring periods and does not constitute an external legal SLA guarantee. Periods when a monitor is paused are excluded.
          </p>
        </div>
      </div>
    </div>
  );
}
