"use client";

import type { ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={300}>{children}</RadixTooltip.Provider>;
}

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "start" | "end";
}) {
  const radixSide = side === "start" ? "left" : side === "end" ? "right" : side;

  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={radixSide}
          sideOffset={6}
          className={cn(
            "z-50 rounded-[var(--radius-sm)] bg-[color:var(--color-ink)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-ink-inverse)] shadow-[var(--shadow-sm)] data-[state=delayed-open]:animate-[fade-in_var(--duration-fast)_var(--ease-brand)]",
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-[color:var(--color-ink)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
