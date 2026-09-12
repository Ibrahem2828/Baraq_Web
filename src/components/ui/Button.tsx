import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-full)] text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-brand)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-solid)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--color-accent-solid)] text-[color:var(--color-accent-contrast)] hover:brightness-95 active:brightness-90",
        secondary:
          "bg-[color:var(--color-bg-soft)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-border)]",
        outline:
          "border border-[color:var(--color-border-strong)] bg-transparent text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg-soft)]",
        ghost: "bg-transparent text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg-soft)]",
        destructive: "bg-[color:var(--color-destructive)] text-white hover:brightness-95",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    // `asChild` composes onto a single child element (e.g. `<Link>`) via
    // Radix `Slot`, which requires exactly one element child — the loading
    // spinner is a second child, so it can only be rendered in plain
    // `<button>` mode. `asChild` + `loading` together isn't a combination
    // this app uses (a link-styled-as-button has nothing async to await).
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
