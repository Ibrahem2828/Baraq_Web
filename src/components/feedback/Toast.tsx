"use client";

import { useTranslations } from "next-intl";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-[color:var(--color-success)]/30 text-[color:var(--color-success)]",
  error: "border-[color:var(--color-destructive)]/30 text-[color:var(--color-destructive)]",
  warning: "border-[color:var(--color-warning)]/30 text-[color:var(--color-warning)]",
  info: "border-[color:var(--color-info)]/30 text-[color:var(--color-info)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", durationMs = 5000 }: ToastInput) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { id, title, description, variant }]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="end-4 pointer-events-none fixed bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
        role="region"
        aria-label={t("common.a11y.notifications")}
      >
        <AnimatePresence>
          {items.map((item) => {
            const Icon = VARIANT_ICON[item.variant];
            return (
              <motion.div
                key={item.id}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                className={cn(
                  "surface-card pointer-events-auto flex items-start gap-3 border p-4",
                  VARIANT_CLASSES[item.variant],
                )}
              >
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="flex-1 text-start">
                  <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-[color:var(--color-ink-soft)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 rounded-full p-1 text-[color:var(--color-ink-faint)] transition-colors hover:bg-[color:var(--color-bg-soft)]"
                  aria-label={t("common.a11y.dismiss")}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
