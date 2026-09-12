"use client";

import type { ReactNode } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-col gap-4", className)}
    >
      <RadixTabs.List className="flex gap-1 rounded-[var(--radius-full)] bg-[color:var(--color-bg-soft)] p-1">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className="flex-1 rounded-[var(--radius-full)] px-4 py-2 text-sm font-semibold text-[color:var(--color-ink-soft)] transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)] focus-visible:outline-none data-[state=active]:bg-[color:var(--color-surface)] data-[state=active]:text-[color:var(--color-ink)] data-[state=active]:shadow-[var(--shadow-sm)]"
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="focus-visible:outline-none"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
