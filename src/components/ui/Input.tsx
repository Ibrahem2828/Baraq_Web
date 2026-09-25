import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  /** Element rendered at the block-start (logical) edge of the field, e.g. an icon. */
  startSlot?: React.ReactNode;
  endSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, description, error, id, startSlot, endSlot, ...props }, ref) => {
    // Addresses and numbers are left-to-right in every language: in the
    // Arabic UI "abc@" was rendered as "@abc". Aligned to the reading edge.
    const ltrValue = props.type === "email" || props.type === "tel" || props.type === "url";
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-[color:var(--color-ink)]">
            {label}
          </label>
        ) : null}
        <div className="relative flex items-center">
          {startSlot ? (
            <span className="start-3 pointer-events-none absolute flex items-center text-[color:var(--color-ink-faint)]">
              {startSlot}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            dir={props.dir ?? (ltrValue ? "ltr" : undefined)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={cn(descriptionId, errorId) || undefined}
            className={cn(
              "h-11 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-ink)] transition-colors duration-[var(--duration-fast)] placeholder:text-[color:var(--color-ink-faint)] focus-visible:border-[color:var(--color-accent-solid)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              startSlot && "ps-10",
              endSlot && "pe-10",
              ltrValue && "rtl:text-right",
              error && "border-[color:var(--color-destructive)]",
              className,
            )}
            {...props}
          />
          {endSlot ? (
            <span className="end-3 absolute flex items-center text-[color:var(--color-ink-faint)]">
              {endSlot}
            </span>
          ) : null}
        </div>
        {description && !error ? (
          <p id={descriptionId} className="text-xs text-[color:var(--color-ink-soft)]">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-[color:var(--color-destructive)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
