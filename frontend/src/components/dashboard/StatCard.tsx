import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
}: StatCardProps) {
  const iconColors = {
    default: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    danger: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-border-light transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={cn("p-2 rounded-lg border", iconColors[variant])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-white font-mono">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
