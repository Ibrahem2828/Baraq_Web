"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter as useNativeRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter as useLocaleRouter } from "@/i18n/navigation";
import { useLogin } from "@/lib/auth/client";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { FadeIn } from "@/components/motion/FadeIn";
import { ApiError } from "@/lib/api/errors";
import { LoadingState } from "@/components/feedback/LoadingState";
import { isSafeRedirectPath } from "@/lib/utils/safe-redirect";

// `useSearchParams()` (for the post-login `?next=` redirect target) opts a
// page out of static rendering unless isolated behind a Suspense boundary —
// see https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations();
  // `next-intl`'s locale-aware router (from `@/i18n/navigation`) always
  // prepends the current locale to whatever path it's given — correct for
  // the internal, locale-free paths used elsewhere on this page (the
  // `Link`s below), but wrong here: `?next=` is set by `src/proxy.ts` from
  // `request.nextUrl.pathname`, which is *already* locale-prefixed (e.g.
  // `/ar/study-plans`). Routing that through the locale-aware router
  // double-prefixed it into `/ar/ar/study-plans` — a real 404, found live in
  // Phase 2.5 while verifying the open-redirect fix still allows legitimate
  // same-origin redirects (`isSafeRedirectPath` correctly allowed the value
  // through; the bug was one layer further, in how it was then navigated
  // to). The plain Next.js router navigates to an already-resolved path
  // as-is, which is what an already-locale-prefixed `next` value needs.
  const router = useNativeRouter();
  const localeRouter = useLocaleRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((data) => {
    login.mutate(data, {
      onSuccess: () => {
        const next = searchParams.get("next");
        router.replace(isSafeRedirectPath(next) ? next : "/");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.fieldErrors?.error_code?.[0] === "email_not_verified") {
          localeRouter.replace(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        const message =
          error instanceof ApiError && error.code === "UNAUTHORIZED"
            ? t("auth.login.invalidCredentials")
            : error instanceof ApiError
              ? t(`errors.${error.code}`)
              : t("errors.UNKNOWN");
        toast({ title: message, variant: "error" });
      },
    });
  });

  return (
    <FadeIn preset="slide-up" className="surface-card p-8">
      <h1 className="text-2xl font-bold text-[color:var(--color-ink)]">{t("auth.login.title")}</h1>
      <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">{t("auth.login.subtitle")}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label={t("auth.login.email")}
          type="email"
          autoComplete="email"
          error={errors.email ? t("common.requiredField") : undefined}
          {...register("email")}
        />
        <PasswordInput
          label={t("auth.login.password")}
          autoComplete="current-password"
          error={errors.password ? t("common.requiredField") : undefined}
          {...register("password")}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[color:var(--color-accent)]"
          >
            {t("auth.login.forgotPassword")}
          </Link>
        </div>
        <Button type="submit" size="lg" loading={login.isPending} className="mt-2">
          {t("auth.login.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[color:var(--color-ink-soft)]">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-[color:var(--color-accent)]">
          {t("auth.login.createAccount")}
        </Link>
      </p>
    </FadeIn>
  );
}
