// Placeholder informational copy — not real legal text; legal will supply the final privacy policy.
"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";

export default function PrivacyPolicyPage() {
  const t = useTranslations();

  return (
    <FadeIn>
      <PageHeader title={t("settings.privacyPolicy")} />
      <Card className="max-w-2xl">
        <p className="text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
          This is placeholder privacy-policy copy for {t("common.appName")}. It describes, in
          general terms, what data the app collects (account details, study activity, and content
          you upload) and how it is used to provide the service. The final, legally reviewed privacy
          policy will replace this text before launch.
        </p>
      </Card>
    </FadeIn>
  );
}
