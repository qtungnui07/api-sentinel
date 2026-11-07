import { AlertOctagon, CheckCircle2 } from "lucide-react";
import { Incident } from "@/types/monitor";
import { formatDate } from "@/lib/utils";

interface IncidentListProps {
  incidents: Incident[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Incidents</h3>
            <p className="text-xs text-slate-400">Chronological log of detected check failures</p>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-border text-slate-400">
          {incidents.length} logged
        </span>
      </div>

      <div className="mt-4 divide-y divide-border/50 max-h-80 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mb-2" />
            <span className="text-slate-300 font-medium">All systems normal</span>
            <span className="text-slate-500 mt-0.5">No recent incidents detected</span>
          </div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="py-3 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">{incident.monitor_name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {incident.error_type || "FAILURE"}
                  </span>
                  {incident.status_code && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      HTTP {incident.status_code}
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-[11px] font-mono truncate max-w-sm">
                  {incident.error_message || incident.url}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                {formatDate(incident.checked_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
