// Placeholder informational copy — product/legal will supply the real "About" content later.
"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";

export default function AboutPage() {
  const t = useTranslations();

  return (
    <FadeIn>
      <PageHeader title={t("settings.about")} />
      <Card className="max-w-2xl">
        <p className="text-sm leading-relaxed text-[color:var(--color-ink-soft)]">
          {t("common.appName")} (برّاق) is an Arabic-first educational companion that helps students
          plan their studies, practice with quizzes, and get AI-assisted recommendations. This is
          placeholder copy, and the final About content will be supplied by the product team.
        </p>
      </Card>
    </FadeIn>
  );
}
