"use client";

import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { validationMessage } from "@/lib/validation/field-error";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { useRequestPasswordReset } from "@/features/auth/hooks/useAuthMutations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { CheckCircle2 } from "lucide-react";
import { syncNativeTextValues } from "@/lib/forms/sync-native-values";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [submitted, setSubmitted] = useState(false);
  const requestReset = useRequestPasswordReset();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const submitValidated = handleSubmit((data) => {
    requestReset.mutate(data, { onSuccess: () => setSubmitted(true) });
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    syncNativeTextValues(event.currentTarget, ["email"], setValue);
    return submitValidated(event);
  }

  return (
    <FadeIn preset="slide-up" className="surface-card p-8">
      <h1 className="text-2xl font-bold text-[color:var(--color-ink)]">
        {t("auth.forgotPassword.title")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        {t("auth.forgotPassword.subtitle")}
      </p>

      {submitted ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-[var(--radius-lg)] bg-[color:var(--color-success-bg)] p-6 text-center">
          <CheckCircle2 className="size-8 text-[color:var(--color-success)]" aria-hidden="true" />
          <p className="text-sm text-[color:var(--color-ink)]">
            {t("auth.forgotPassword.success")}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <Input
            label={t("auth.forgotPassword.email")}
            type="email"
            autoComplete="email"
            error={validationMessage(errors.email, t)}
            {...register("email")}
          />
          <Button type="submit" size="lg" loading={requestReset.isPending} className="mt-2">
            {t("auth.forgotPassword.submit")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-[color:var(--color-accent)]">
          {t("auth.forgotPassword.backToLogin")}
        </Link>
      </p>
    </FadeIn>
  );
}
