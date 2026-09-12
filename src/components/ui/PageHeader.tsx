import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[color:var(--color-ink)] sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-[color:var(--color-ink-soft)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}
