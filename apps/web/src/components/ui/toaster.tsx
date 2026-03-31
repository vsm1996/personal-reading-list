"use client";

import { useUIStore } from "@/stores/ui.store";
import type { Toast } from "@/stores/ui.store";
import { CheckCircle, Info, XCircle, X } from "lucide-react";
import { useEffect } from "react";

const AUTO_DISMISS_MS = 4000;

const ICONS = {
  success: <CheckCircle size={16} className="shrink-0 text-success" />,
  error: <XCircle size={16} className="shrink-0 text-error" />,
  info: <Info size={16} className="shrink-0 text-accent" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore((s) => s.removeToast);

  // Auto-dismiss after AUTO_DISMISS_MS
  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg"
      // Entrance animation via Renge sacred-fade keyframe at short duration
      style={{ animation: "rengeSacredFade var(--renge-duration-3) var(--renge-easing-ease-out) both" }}
    >
      {ICONS[toast.type]}
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss"
        className="rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Fixed bottom-right stack of toast notifications. Placed in root layout. */
export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[100] flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
