import { cn } from "@/lib/utils/cn";

export function Divider({
  className,
  orientation = "horizontal",
  label,
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
  label?: string;
}) {
  if (label) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 text-xs text-[color:var(--color-ink-faint)]",
          className,
        )}
      >
        <span className="h-px flex-1 bg-[color:var(--color-border)]" />
        {label}
        <span className="h-px flex-1 bg-[color:var(--color-border)]" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        "bg-[color:var(--color-border)]",
        className,
      )}
    />
  );
}
