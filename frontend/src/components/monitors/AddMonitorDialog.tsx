"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Globe, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { MonitorCreateInput } from "@/types/monitor";

const monitorSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name must be less than 120 chars"),
  url: z
    .string()
    .url("Must be a valid URL")
    .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
      message: "URL scheme must be http:// or https://",
    }),
  method: z.enum(["GET", "HEAD"]),
  interval_seconds: z.coerce.number().refine((val) => [30, 60, 300].includes(val), {
    message: "Interval must be 30s, 60s, or 300s (5m)",
  }),
  timeout_seconds: z.coerce.number().min(1).max(60),
  expected_status_code: z.coerce.number().min(100).max(599),
});

type FormValues = z.infer<typeof monitorSchema>;

interface AddMonitorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MonitorCreateInput) => Promise<void>;
}

export function AddMonitorDialog({ isOpen, onClose, onSubmit }: AddMonitorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      name: "",
      url: "",
      method: "GET",
      interval_seconds: 60,
      timeout_seconds: 10,
      expected_status_code: 200,
    },
  });

  if (!isOpen) return null;

  const handleFormSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(values as MonitorCreateInput);
      reset();
      onClose();
    } catch (err: any) {
      setServerError(err.message || "Failed to create monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add New Monitor</h2>
              <p className="text-xs text-slate-400">Configure endpoint uptime and latency check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server error banner */}
        {serverError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Monitor Name *
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Authentication Service"
              className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Endpoint URL *
            </label>
            <input
              {...register("url")}
              placeholder="https://api.example.com/health"
              className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.url && (
              <p className="mt-1 text-xs text-rose-400">{errors.url.message}</p>
            )}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
              <span>SSRF protected: only public hosts on port 80 & 443 permitted.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                HTTP Method
              </label>
              <select
                {...register("method")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Interval
              </label>
              <select
                {...register("interval_seconds")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 60 seconds</option>
                <option value={300}>Every 5 minutes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Timeout (seconds)
              </label>
              <input
                type="number"
                {...register("timeout_seconds")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              {errors.timeout_seconds && (
                <p className="mt-1 text-xs text-rose-400">{errors.timeout_seconds.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Expected Status Code
              </label>
              <input
                type="number"
                {...register("expected_status_code")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              {errors.expected_status_code && (
                <p className="mt-1 text-xs text-rose-400">{errors.expected_status_code.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Monitor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
