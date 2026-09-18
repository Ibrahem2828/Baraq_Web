"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyEmailOtpSchema, type VerifyEmailOtpInput } from "@/lib/validation/auth";
import { fieldErrorMessage } from "@/lib/validation/field-error";
import { useVerifyEmail } from "@/lib/auth/client";
import { useResendOtp } from "@/features/auth/hooks/useAuthMutations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";
import { ApiError } from "@/lib/api/errors";
import { LoadingState } from "@/components/feedback/LoadingState";
import { syncNativeTextValues } from "@/lib/forms/sync-native-values";

const OTP_ERROR_MESSAGE_KEY: Record<string, string> = {
  otp_expired: "auth.verifyEmail.codeExpired",
  otp_too_many_attempts: "auth.verifyEmail.tooManyAttempts",
  otp_invalid: "auth.verifyEmail.codeInvalid",
};

// `useSearchParams()` (for the `?email=` carried over from registration/login)
// opts a page out of static rendering unless isolated behind Suspense — same
// reasoning as the login page.
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const verifyEmail = useVerifyEmail();
  const resendOtp = useResendOtp();
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailOtpInput>({ resolver: zodResolver(verifyEmailOtpSchema) });

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const submitValidated = handleSubmit((data) => {
    verifyEmail.mutate(
      { email, code: data.code },
      {
        onSuccess: () => router.replace("/"),
        onError: (error) => {
          const backendCode =
            error instanceof ApiError ? error.fieldErrors?.error_code?.[0] : undefined;
          const messageKey =
            (backendCode && OTP_ERROR_MESSAGE_KEY[backendCode]) ?? "errors.UNKNOWN";
          setError("code", { type: "manual", message: t(messageKey) });
        },
      },
    );
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    syncNativeTextValues(event.currentTarget, ["code"], setValue);
    return submitValidated(event);
  }

  function handleResend() {
    resendOtp.mutate(email, {
      onSuccess: () => {
        toast({ title: t("auth.verifyEmail.resendSuccess"), variant: "success" });
        setCooldown(60);
      },
      onError: (error) => {
        const retryAfter =
          error instanceof ApiError ? Number(error.fieldErrors?.retry_after_seconds?.[0]) : NaN;
        if (Number.isFinite(retryAfter)) {
          setCooldown(retryAfter);
          toast({ title: t("auth.verifyEmail.resendCooldownToast"), variant: "error" });
        } else {
          toast({ title: t("errors.UNKNOWN"), variant: "error" });
        }
      },
    });
  }

  if (!email) {
    return (
      <FadeIn preset="slide-up" className="surface-card p-8">
        <h1 className="text-2xl font-bold text-[color:var(--color-ink)]">
          {t("auth.verifyEmail.title")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-ink-soft)]">
          {t("auth.verifyEmail.missingEmail")}
        </p>
        <Link
          href="/register"
          className="mt-4 inline-block font-semibold text-[color:var(--color-accent)]"
        >
          {t("auth.register.title")}
        </Link>
      </FadeIn>
    );
  }

  return (
    <FadeIn preset="slide-up" className="surface-card p-8">
      <h1 className="text-2xl font-bold text-[color:var(--color-ink)]">
        {t("auth.verifyEmail.title")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
        {t("auth.verifyEmail.subtitle", { email })}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label={t("auth.verifyEmail.codeField")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={fieldErrorMessage(errors.code, () => t("common.requiredField"))}
          {...register("code")}
        />
        <Button type="submit" size="lg" loading={verifyEmail.isPending} className="mt-2">
          {t("auth.verifyEmail.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[color:var(--color-ink-soft)]">
        {t("auth.verifyEmail.noCode")}{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resendOtp.isPending}
          className="font-semibold text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0
            ? t("auth.verifyEmail.resendCooldown", { seconds: cooldown })
            : t("auth.verifyEmail.resend")}
        </button>
      </p>
    </FadeIn>
  );
}
