"use client";

import * as RadixProgress from "@radix-ui/react-progress";
import { cn } from "@/lib/utils/cn";

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  indeterminate?: boolean;
}

export function Progress({
  value,
  max = 100,
  label,
  className,
  indeterminate = false,
}: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs text-[color:var(--color-ink-soft)]">
          <span>{label}</span>
          {!indeterminate ? <span>{Math.round(percent)}%</span> : null}
        </div>
      ) : null}
      <RadixProgress.Root
        value={indeterminate ? undefined : percent}
        className="h-2 w-full overflow-hidden rounded-[var(--radius-full)] bg-[color:var(--color-bg-soft)]"
      >
        <RadixProgress.Indicator
          className={cn(
            "h-full rounded-[var(--radius-full)] bg-[color:var(--color-accent-solid)] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-brand)]",
            indeterminate && "w-1/3 animate-[progress-indeterminate_1.3s_ease-in-out_infinite]",
          )}
          style={indeterminate ? undefined : { transform: `translateX(-${100 - percent}%)` }}
        />
      </RadixProgress.Root>
    </div>
  );
}
