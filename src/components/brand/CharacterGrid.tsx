"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CHARACTER_LIST } from "@/config/characters";
import { CharacterCard } from "@/components/brand/CharacterCard";
import { StaggerIn, StaggerItem } from "@/components/motion/FadeIn";

/**
 * The five characters, the one grid used everywhere (Home, the characters
 * route, a project's Characters tab) instead of three hand-copied ones.
 * Inside a project the hub opens already scoped to it.
 */
export function CharacterGrid({ projectId }: { projectId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  return (
    <StaggerIn className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {CHARACTER_LIST.map((character) => (
        <StaggerItem key={character.key} className="h-full">
          <CharacterCard
            character={character}
            role={t(`characters.${character.key}.role`)}
            comingSoonLabel={t("common.comingSoon")}
            onSelect={() =>
              router.push(
                projectId
                  ? `/characters/${character.key}?project=${encodeURIComponent(projectId)}`
                  : `/characters/${character.key}`,
              )
            }
          />
        </StaggerItem>
      ))}
    </StaggerIn>
  );
}
