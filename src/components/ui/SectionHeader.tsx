import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-lg font-bold text-[color:var(--color-ink)]">{title}</h2>
      {action}
    </div>
  );
}
