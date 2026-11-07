import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "N/A";
  if (ms < 1) return "<1 ms";
  return `${Math.round(ms)} ms`;
}

export function formatUptime(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "N/A";
  return `${pct.toFixed(1)}%`;
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "Never";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
      " " +
      d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "Invalid date";
  }
}
