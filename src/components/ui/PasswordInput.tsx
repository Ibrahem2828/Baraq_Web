"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input, type InputProps } from "./Input";

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "endSlot">>(
  (props, ref) => {
    const t = useTranslations("common.a11y");
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        autoComplete={props.autoComplete ?? "current-password"}
        endSlot={
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="pointer-events-auto text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)]"
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            tabIndex={-1}
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        }
        {...props}
      />
    );
  },
);
PasswordInput.displayName = "PasswordInput";
