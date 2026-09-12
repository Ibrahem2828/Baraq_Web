"use client";

import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
};

export function Avatar({ src, alt, fallback, size = "md", className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-accent-solid)]/20 font-semibold text-[color:var(--color-accent)]",
        SIZE_CLASS[size],
        className,
      )}
    >
      {src ? <RadixAvatar.Image src={src} alt={alt} className="size-full object-cover" /> : null}
      <RadixAvatar.Fallback delayMs={src ? 400 : 0}>{fallback}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
