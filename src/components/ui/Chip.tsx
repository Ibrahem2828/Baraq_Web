import { forwardRef, type ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  onRemove?: () => void;
}

/** A selectable/removable filter pill — e.g. subject filters, tag lists. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected = false, onRemove, children, ...props }, ref) => {
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
        {onRemove ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            aria-label="Remove"
            className="rounded-full p-0.5 hover:bg-black/5"
          >
            <X className="size-3" aria-hidden="true" />
          </span>
        ) : null}
      </button>
    );
  },
);
Chip.displayName = "Chip";
