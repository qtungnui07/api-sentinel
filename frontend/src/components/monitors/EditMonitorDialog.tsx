"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Edit3, Loader2, X } from "lucide-react";
import { Monitor, MonitorUpdateInput } from "@/types/monitor";

const editSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  url: z.string().url("Must be a valid URL"),
  method: z.enum(["GET", "HEAD"]),
  interval_seconds: z.coerce.number().refine((val) => [30, 60, 300].includes(val), {
    message: "Interval must be 30s, 60s, or 300s",
  }),
  timeout_seconds: z.coerce.number().min(1).max(60),
  expected_status_code: z.coerce.number().min(100).max(599),
});

type FormValues = z.infer<typeof editSchema>;

interface EditMonitorDialogProps {
  monitor: Monitor | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: MonitorUpdateInput) => Promise<void>;
}

export function EditMonitorDialog({
  monitor,
  isOpen,
  onClose,
  onSubmit,
}: EditMonitorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (monitor) {
      reset({
        name: monitor.name,
        url: monitor.url,
        method: monitor.method,
        interval_seconds: monitor.interval_seconds,
        timeout_seconds: monitor.timeout_seconds,
        expected_status_code: monitor.expected_status_code,
      });
      setServerError(null);
    }
  }, [monitor, reset]);

  if (!isOpen || !monitor) return null;

  const handleFormSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(monitor.id, values as MonitorUpdateInput);
      onClose();
    } catch (err: any) {
      setServerError(err.message || "Failed to update monitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Edit Monitor</h2>
              <p className="text-xs text-slate-400">Update configuration for {monitor.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {serverError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Monitor Name</label>
            <input
              {...register("name")}
              className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Endpoint URL</label>
            <input
              {...register("url")}
              className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            {errors.url && <p className="mt-1 text-xs text-rose-400">{errors.url.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">HTTP Method</label>
              <select
                {...register("method")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Interval</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Timeout (s)</label>
              <input
                type="number"
                {...register("timeout_seconds")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Expected Status</label>
              <input
                type="number"
                {...register("expected_status_code")}
                className="w-full bg-slate-900 border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
