import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/**
 * A selectable filter pill — subject filters, tag lists.
 *
 * It had a remove affordance: a `<span role="button" tabIndex={-1}>` nested
 * inside the chip's own `<button>`. That is interactive content inside
 * interactive content, which is invalid, and the negative tabindex meant a
 * keyboard user could never reach it — the control existed only for a
 * mouse. Nothing in the app ever passed `onRemove`, so it is gone rather
 * than repaired; a removable chip needs the remove control as a sibling of
 * the chip, not a child of it.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-3.5 py-1.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
          selected
            ? "border-[color:var(--color-accent-solid)] bg-[color:var(--color-accent-solid)]/15 text-[color:var(--color-accent)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-border-strong)]",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Chip.displayName = "Chip";
