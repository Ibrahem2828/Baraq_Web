"use client";

import type { FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { useRegister } from "@/features/auth/hooks/useAuthMutations";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";
import { ApiError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import { validationMessage } from "@/lib/validation/field-error";
import { syncNativeTextValues } from "@/lib/forms/sync-native-values";

export default function RegisterPage() {
  const t = useTranslations();
  const router = useRouter();
  const registerMutation = useRegister();
  const { toast } = useToast();
  const resolveApiError = useApiErrorMessage();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const submitValidated = handleSubmit((data) => {
    registerMutation.mutate(data, {
      onSuccess: (pending) => {
        toast({ title: t("auth.register.otpSent"), variant: "success" });
        router.replace(
          `/verify-email?email=${encodeURIComponent(pending.email)}&expires_in=${pending.expires_in}&resend_after=${pending.resend_after_seconds}`,
        );
      },
      onError: (error) => {
        if (error instanceof ApiError && error.backendCode === "email_already_registered") {
          setError("email", { message: t("auth.register.emailTaken") });
          return;
        }
        toast({
          title: resolveApiError(error),
          variant: "error",
        });
      },
    });
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    syncNativeTextValues(
      event.currentTarget,
      ["full_name", "email", "phone_number", "password", "password_confirm"],
      setValue,
    );
    return submitValidated(event);
  }

  return (
    <FadeIn preset="slide-up" className="surface-card p-8">
      <h1 className="text-2xl font-bold text-[color:var(--color-ink)]">
        {t("auth.register.title")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        {t("auth.register.subtitle")}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label={t("auth.register.fullName")}
          autoComplete="name"
          error={validationMessage(errors.full_name, t)}
          {...register("full_name")}
        />
        <Input
          label={t("auth.register.email")}
          type="email"
          autoComplete="email"
          error={validationMessage(errors.email, t)}
          {...register("email")}
        />
        <Input
          label={t("auth.register.phoneNumber")}
          type="tel"
          autoComplete="tel"
          error={validationMessage(errors.phone_number, t)}
          {...register("phone_number")}
        />
        <PasswordInput
          label={t("auth.register.password")}
          autoComplete="new-password"
          error={validationMessage(errors.password, t, "auth.passwordTooShort")}
          {...register("password")}
        />
        <PasswordInput
          label={t("auth.register.passwordConfirm")}
          autoComplete="new-password"
          error={validationMessage(errors.password_confirm, t, "auth.passwordMismatch")}
          {...register("password_confirm")}
        />
        <Button type="submit" size="lg" loading={registerMutation.isPending} className="mt-2">
          {t("auth.register.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[color:var(--color-ink-soft)]">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-[color:var(--color-accent)]">
          {t("auth.register.login")}
        </Link>
      </p>
    </FadeIn>
  );
}
