import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[color:var(--color-bg-soft)]",
        className,
      )}
    />
  );
}

/** A ready-made 3-line skeleton for card-shaped loading states. */
export function CardSkeleton() {
  return (
    <div className="surface-card flex flex-col gap-3 p-6">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}
