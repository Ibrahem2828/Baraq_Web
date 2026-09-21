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
import { useApiErrorMessage } from "@/lib/api/useApiErrorMessage";
import { LoadingState } from "@/components/feedback/LoadingState";
import { syncNativeTextValues } from "@/lib/forms/sync-native-values";

const OTP_ERROR_MESSAGE_KEY: Record<string, string> = {
  otp_expired: "auth.verifyEmail.codeExpired",
  otp_too_many_attempts: "auth.verifyEmail.tooManyAttempts",
  otp_invalid: "auth.verifyEmail.codeInvalid",
};

function readPositiveSeconds(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  return Number(value);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(local.length - 2, 4)))}@${domain}`;
}

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
  const resolveApiError = useApiErrorMessage();
  const initialCooldown = readPositiveSeconds(searchParams.get("resend_after")) ?? 0;
  const initialExpiry = readPositiveSeconds(searchParams.get("expires_in"));
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [expiresIn, setExpiresIn] = useState<number | null>(initialExpiry);

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

  useEffect(() => {
    if (expiresIn === null || expiresIn <= 0) return;
    const interval = setInterval(() => setExpiresIn((seconds) => (seconds === null ? null : Math.max(0, seconds - 1))), 1000);
    return () => clearInterval(interval);
  }, [expiresIn]);

  const isExpired = expiresIn === 0;

  const submitValidated = handleSubmit((data) => {
    verifyEmail.mutate(
      { email, code: data.code },
      {
        onSuccess: () => router.replace("/"),
        onError: (error) => {
          const backendCode =
            error instanceof ApiError
              ? error.backendCode ?? error.fieldErrors?.error_code?.[0]
              : undefined;
          const messageKey =
            (backendCode && OTP_ERROR_MESSAGE_KEY[backendCode]) ?? null;
          setError("code", {
            type: "manual",
            message: messageKey ? t(messageKey) : resolveApiError(error),
          });
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
      onSuccess: (pending) => {
        toast({ title: t("auth.verifyEmail.resendSuccess"), variant: "success" });
        setCooldown(pending.resend_after_seconds);
        setExpiresIn(pending.expires_in);
      },
      onError: (error) => {
        const retryAfter =
          error instanceof ApiError ? Number(error.fieldErrors?.retry_after_seconds?.[0]) : NaN;
        if (Number.isFinite(retryAfter)) {
          setCooldown(retryAfter);
          toast({ title: t("auth.verifyEmail.resendCooldownToast"), variant: "error" });
        } else {
          toast({ title: resolveApiError(error), variant: "error" });
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
        {t("auth.verifyEmail.subtitle", { email: maskEmail(email) })}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label={t("auth.verifyEmail.codeField")}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          error={fieldErrorMessage(errors.code, () => t("common.requiredField"))}
          {...register("code")}
        />
        <Button type="submit" size="lg" loading={verifyEmail.isPending} disabled={isExpired} className="mt-2">
          {t("auth.verifyEmail.submit")}
        </Button>
        {isExpired ? (
          <p className="text-sm text-[color:var(--color-danger)]">{t("auth.verifyEmail.codeExpired")}</p>
        ) : null}
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
