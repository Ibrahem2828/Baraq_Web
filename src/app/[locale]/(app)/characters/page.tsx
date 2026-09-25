"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CHARACTER_LIST } from "@/config/characters";
import { CharacterCard } from "@/components/brand/CharacterCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

export default function CharactersHubPage() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div>
      <PageHeader title={t("characters.hub.title")} description={t("characters.hub.subtitle")} />
      <StaggerIn className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CHARACTER_LIST.map((character) => (
          <StaggerItem key={character.key} className="h-full">
            <CharacterCard
              character={character}
              role={t(`characters.${character.key}.role`)}
              comingSoonLabel={t("common.comingSoon")}
              onSelect={() => router.push(`/characters/${character.key}`)}
            />
          </StaggerItem>
        ))}
      </StaggerIn>
    </div>
  );
}
