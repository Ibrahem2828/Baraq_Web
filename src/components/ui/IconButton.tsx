import { forwardRef } from "react";
import { Button, type ButtonProps } from "./Button";
import { cn } from "@/lib/utils/cn";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "size-9",
  md: "size-11",
  lg: "size-13",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", variant = "ghost", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        className={cn(SIZE_CLASS[size], "p-0", className)}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";
