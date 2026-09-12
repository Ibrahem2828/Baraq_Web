// Placeholder informational copy — not real legal text; legal will supply the final terms of service.
"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";

export default function TermsOfServicePage() {
  const t = useTranslations();

  return (
    <FadeIn>
      <PageHeader title={t("settings.termsOfService")} />
      <Card className="max-w-2xl">
        <p className="text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
          This is placeholder terms-of-service copy for {t("common.appName")}. It outlines, in
          general terms, acceptable use of the platform, account responsibilities, and subscription
          conditions. The final, legally reviewed terms of service will replace this text before
          launch.
        </p>
      </Card>
    </FadeIn>
  );
}
