"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CharacterDefinition } from "@/config/characters";
import { CharacterAvatar } from "@/components/brand/CharacterAvatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FadeIn } from "@/components/motion/FadeIn";

export function CharacterDetailView({ character }: { character: CharacterDefinition }) {
  const t = useTranslations();

  return (
    <div>
      <PageHeader
        title={character.name}
        description={t(`characters.${character.key}.role`)}
        actions={<CharacterAvatar character={character} size="lg" />}
      />

      {!character.isLive ? (
        <FadeIn preset="fade">
          <EmptyState
            icon={<Sparkles className="size-6" aria-hidden="true" />}
            title={t("common.comingSoon")}
            description={t(`characters.${character.key}.role`)}
          />
        </FadeIn>
      ) : (
        <FadeIn preset="slide-up" className="surface-card flex flex-col items-start gap-4 p-6">
          <Badge variant="accent">{t(`characters.${character.key}.role`)}</Badge>
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {t("emptyStates.sources.description")}
          </p>
          <Button asChild>
            <Link href="/library">{t("emptyStates.sources.action")}</Link>
          </Button>
        </FadeIn>
      )}
    </div>
  );
}
