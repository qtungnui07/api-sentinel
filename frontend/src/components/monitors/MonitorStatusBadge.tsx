import { MonitorStatus } from "@/types/monitor";
import { cn } from "@/lib/utils";

interface MonitorStatusBadgeProps {
  status: MonitorStatus;
  className?: string;
}

export function MonitorStatusBadge({ status, className }: MonitorStatusBadgeProps) {
  const configs = {
    UP: {
      label: "Operational",
      dot: "bg-emerald-400",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    DOWN: {
      label: "Downtime",
      dot: "bg-rose-400 animate-pulse",
      bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    PAUSED: {
      label: "Paused",
      dot: "bg-slate-400",
      bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    },
    PENDING: {
      label: "Checking...",
      dot: "bg-amber-400 animate-ping",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  };

  const config = configs[status] || configs.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide",
        config.bg,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
