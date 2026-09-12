import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, description, error, id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const descriptionId = description ? `${textareaId}-description` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={textareaId} className="text-sm font-medium text-[color:var(--color-ink)]">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          className={cn(
            "w-full resize-y rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 text-sm text-[color:var(--color-ink)] transition-colors duration-[var(--duration-fast)] placeholder:text-[color:var(--color-ink-faint)] focus-visible:border-[color:var(--color-accent-solid)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[color:var(--color-destructive)]",
            className,
          )}
          {...props}
        />
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
Textarea.displayName = "Textarea";
