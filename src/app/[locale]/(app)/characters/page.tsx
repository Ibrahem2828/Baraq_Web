"use client";

import { useTranslations } from "next-intl";
import { CharacterGrid } from "@/components/brand/CharacterGrid";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CharactersHubPage() {
  const t = useTranslations();
  return (
    <div>
      <PageHeader title={t("characters.hub.title")} description={t("characters.hub.subtitle")} />
      <CharacterGrid />
    </div>
  );
}
