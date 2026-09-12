import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink-soft)]",
        accent: "bg-[color:var(--color-accent-solid)]/15 text-[color:var(--color-accent)]",
        success: "bg-[color:var(--color-success-bg)] text-[color:var(--color-success)]",
        warning: "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning)]",
        destructive: "bg-[color:var(--color-destructive-bg)] text-[color:var(--color-destructive)]",
        info: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
