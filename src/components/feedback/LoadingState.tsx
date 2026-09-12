import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 py-14 text-center", className)}
    >
      <Loader2
        className="size-6 animate-spin text-[color:var(--color-accent-solid)]"
        aria-hidden="true"
      />
      {label ? <p className="text-sm text-[color:var(--color-ink-soft)]">{label}</p> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
