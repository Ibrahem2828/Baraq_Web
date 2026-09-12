"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  hideTitle?: boolean;
  side?: "start" | "end";
  children: ReactNode;
  className?: string;
}

/** A slide-in panel anchored to the logical inline start/end edge — used for mobile nav and filter panels. */
export function Drawer({
  open,
  onOpenChange,
  title,
  hideTitle = true,
  side = "start",
  children,
  className,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "inset-block-0 fixed z-50 flex h-full w-[min(85vw,20rem)] flex-col overflow-y-auto border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-md)] focus:outline-none",
            side === "start"
              ? "inset-inline-start-0 data-[state=open]:animate-drawer-start border-e [animation-duration:var(--duration-normal)] [animation-timing-function:var(--ease-brand)]"
              : "inset-inline-end-0 data-[state=open]:animate-drawer-end border-s [animation-duration:var(--duration-normal)] [animation-timing-function:var(--ease-brand)]",
            className,
          )}
        >
          {hideTitle ? (
            <VisuallyHidden asChild>
              <Dialog.Title>{title}</Dialog.Title>
            </VisuallyHidden>
          ) : (
            <Dialog.Title className="text-lg font-bold text-[color:var(--color-ink)]">
              {title}
            </Dialog.Title>
          )}
          <Dialog.Close
            className="inset-inline-end-4 absolute top-4 rounded-full p-1.5 text-[color:var(--color-ink-faint)] transition-colors hover:bg-[color:var(--color-bg-soft)]"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
          <div className="mt-8">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
