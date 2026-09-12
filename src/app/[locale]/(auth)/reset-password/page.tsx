"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { useConfirmPasswordReset } from "@/features/auth/hooks/useAuthMutations";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { LoadingState } from "@/components/feedback/LoadingState";
import { CheckCircle2 } from "lucide-react";

// Same allowlist the mobile app enforces on the `baraq://reset-password` deep
// link (src/navigation/deepLinks.ts) — defense in depth against a malformed
// or malicious query string reaching the confirm-reset API call.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

// `useSearchParams()` (for the `uid`/`token` query params) opts a page out of
// static rendering unless isolated behind a Suspense boundary — see
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const isValidLink = TOKEN_PATTERN.test(uid) && TOKEN_PATTERN.test(token);
  const confirmReset = useConfirmPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { uid, token },
  });

  const onSubmit = handleSubmit((data) => {
    confirmReset.mutate(data);
  });

  if (!isValidLink) {
    return (
      <FadeIn preset="slide-up" className="surface-card p-8 text-center">
        <p className="text-sm text-[color:var(--color-destructive)]">
          {t("auth.resetPassword.invalidLink")}
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block font-semibold text-[color:var(--color-accent)]"
        >
          {t("auth.forgotPassword.title")}
        </Link>
      </FadeIn>
    );
  }

  if (confirmReset.isSuccess) {
    return (
      <FadeIn
        preset="slide-up"
        className="surface-card flex flex-col items-center gap-3 p-8 text-center"
      >
        <CheckCircle2 className="size-8 text-[color:var(--color-success)]" aria-hidden="true" />
        <p className="text-sm text-[color:var(--color-ink)]">{t("auth.resetPassword.success")}</p>
        <Link href="/login" className="font-semibold text-[color:var(--color-accent)]">
          {t("auth.login.title")}
        </Link>
      </FadeIn>
    );
  }

  return (
    <FadeIn preset="slide-up" className="surface-card p-8">
      <h1 className="text-2xl font-bold text-[color:var(--color-ink)]">
        {t("auth.resetPassword.title")}
      </h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <input type="hidden" {...register("uid")} />
        <input type="hidden" {...register("token")} />
        <PasswordInput
          label={t("auth.resetPassword.newPassword")}
          autoComplete="new-password"
          error={errors.new_password ? t("auth.passwordTooShort") : undefined}
          {...register("new_password")}
        />
        <PasswordInput
          label={t("auth.resetPassword.confirmPassword")}
          autoComplete="new-password"
          error={errors.confirm_password ? t("auth.passwordMismatch") : undefined}
          {...register("confirm_password")}
        />
        <Button type="submit" size="lg" loading={confirmReset.isPending} className="mt-2">
          {t("auth.resetPassword.submit")}
        </Button>
      </form>
    </FadeIn>
  );
}
