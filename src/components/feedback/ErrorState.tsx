import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className,
}: {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[color:var(--color-destructive)]/20 bg-[color:var(--color-destructive-bg)] px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-[color:var(--color-destructive)]/15 text-[color:var(--color-destructive)]">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[color:var(--color-ink)]">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-[color:var(--color-ink-soft)]">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          {retryLabel ?? "Retry"}
        </Button>
      ) : null}
    </div>
  );
}
