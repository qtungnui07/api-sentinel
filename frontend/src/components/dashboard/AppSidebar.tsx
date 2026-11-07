"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertOctagon,
  BarChart3,
  Layers,
  Radio,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Monitors", href: "/monitors", icon: Radio },
  { name: "Incidents", href: "/incidents", icon: AlertOctagon },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar border-r border-border shrink-0 min-h-screen flex flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-wide">API SENTINEL</span>
            <span className="block text-[10px] text-slate-400 font-mono">OBSERVABILITY</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-card-hover"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Security notice footer */}
      <div className="p-4 border-t border-border">
        <div className="p-3 rounded-lg bg-card border border-border/80 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400">
            <span className="font-medium text-slate-300 block">SSRF Protected</span>
            Destination IP pinning & DNS rebind protection active
          </div>
        </div>
      </div>
    </aside>
  );
}
