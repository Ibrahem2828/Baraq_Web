import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

/**
 * Native `<select>` under the hood — fully keyboard/screen-reader accessible
 * out of the box (OS-native listbox), which a hand-rolled or Radix-based
 * combobox would only replicate at extra cost. Reach for a custom listbox
 * only if a future requirement needs rich option content.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-[color:var(--color-ink)]">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={errorId}
            className={cn(
              "h-11 w-full appearance-none rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] ps-4 pe-10 text-sm text-[color:var(--color-ink)] transition-colors duration-[var(--duration-fast)] focus-visible:border-[color:var(--color-accent-solid)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-[color:var(--color-destructive)]",
              className,
            )}
            {...props}
          >
            {placeholder ? (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="end-3 pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-ink-faint)]"
            aria-hidden="true"
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-[color:var(--color-destructive)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";
