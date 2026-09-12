"use client";

import type { ReactNode } from "react";
import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DropdownItem {
  value: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  selectedValue?: string;
  align?: "start" | "center" | "end";
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  selectedValue,
  align = "start",
}: DropdownProps) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={8}
          className="z-50 min-w-48 rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1.5 shadow-[var(--shadow-md)] data-[state=open]:animate-[fade-in_var(--duration-fast)_var(--ease-brand)]"
        >
          {items.map((item) => (
            <RadixDropdown.Item
              key={item.value}
              onSelect={() => onSelect(item.value)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm transition-colors outline-none data-[highlighted]:bg-[color:var(--color-bg-soft)]",
                item.destructive
                  ? "text-[color:var(--color-destructive)]"
                  : "text-[color:var(--color-ink)]",
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {selectedValue === item.value ? (
                <Check className="size-4" aria-hidden="true" />
              ) : null}
            </RadixDropdown.Item>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
