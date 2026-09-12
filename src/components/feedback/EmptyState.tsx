import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-border)] px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-14 items-center justify-center rounded-full bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-faint)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[color:var(--color-ink)]">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-[color:var(--color-ink-soft)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
