"use client";

import { useTranslations } from "next-intl";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Set when `title` is only for screen readers (e.g. a purely visual header is rendered elsewhere). */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const t = useTranslations();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-[fade-in_var(--duration-normal)_var(--ease-brand)]" />
        <Dialog.Content
          className={cn(
            "fixed inset-0 z-50 m-auto flex h-fit max-h-[85vh] w-[min(92vw,32rem)] flex-col overflow-y-auto rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-md)] focus:outline-none data-[state=open]:animate-[scale-in_var(--duration-normal)_var(--ease-brand)]",
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
          {description ? (
            <Dialog.Description className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
              {description}
            </Dialog.Description>
          ) : null}
          <div className="mt-4 flex-1">{children}</div>
          {footer ? <div className="mt-6 flex items-center justify-end gap-3">{footer}</div> : null}
          <Dialog.Close
            className="inset-inline-end-4 absolute top-4 rounded-full p-1.5 text-[color:var(--color-ink-faint)] transition-colors hover:bg-[color:var(--color-bg-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)] focus-visible:outline-none"
            aria-label={t("common.close")}
          >
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
