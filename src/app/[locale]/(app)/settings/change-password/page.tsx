"use client";

import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useChangePassword } from "@/features/auth/hooks/useAuthMutations";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";
import { ApiError } from "@/lib/api/errors";
import { syncNativeTextValues } from "@/lib/forms/sync-native-values";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: z.string().min(10, { message: "auth.passwordTooShort" }),
    new_password_confirm: z.string(),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    path: ["new_password_confirm"],
    message: "auth.passwordMismatch",
  });
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const submitValidated = handleSubmit((data) => {
    changePassword.mutate(
      { current_password: data.current_password, new_password: data.new_password },
      {
        onSuccess: () => {
          toast({ title: t("settings.changePassword.success"), variant: "success" });
          reset();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.fieldErrors?.current_password) {
            setError("current_password", { message: t("auth.login.invalidCredentials") });
            return;
          }
          toast({ title: t("errors.UNKNOWN"), variant: "error" });
        },
      },
    );
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    syncNativeTextValues(
      event.currentTarget,
      ["current_password", "new_password", "new_password_confirm"],
      setValue,
    );
    return submitValidated(event);
  }

  return (
    <FadeIn>
      <PageHeader title={t("settings.changePassword.title")} />
      <Card className="max-w-lg">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <PasswordInput
            label={t("settings.changePassword.currentPassword")}
            autoComplete="current-password"
            error={errors.current_password ? t("common.requiredField") : undefined}
            {...register("current_password")}
          />
          <PasswordInput
            label={t("settings.changePassword.newPassword")}
            autoComplete="new-password"
            error={errors.new_password ? t("auth.passwordTooShort") : undefined}
            {...register("new_password")}
          />
          <PasswordInput
            label={t("auth.resetPassword.confirmPassword")}
            autoComplete="new-password"
            error={errors.new_password_confirm ? t("auth.passwordMismatch") : undefined}
            {...register("new_password_confirm")}
          />
          <Button type="submit" loading={changePassword.isPending} className="mt-2 self-start">
            {t("common.save")}
          </Button>
        </form>
      </Card>
    </FadeIn>
  );
}
