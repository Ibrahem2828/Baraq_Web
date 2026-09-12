"use client";

import { motion } from "motion/react";
import type { CharacterDefinition } from "@/config/characters";
import { CharacterAvatar } from "./CharacterAvatar";
import { Badge } from "@/components/ui/Badge";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { cn } from "@/lib/utils/cn";

export function CharacterCard({
  character,
  role,
  comingSoonLabel,
  onSelect,
  className,
}: {
  character: CharacterDefinition;
  role: string;
  comingSoonLabel: string;
  onSelect?: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      disabled={!character.isLive}
      whileHover={reduced || !character.isLive ? undefined : { y: -4 }}
      whileTap={reduced || !character.isLive ? undefined : { scale: 0.985 }}
      className={cn(
        "surface-card flex flex-col items-center gap-3 p-6 text-center transition-shadow duration-[var(--duration-normal)] disabled:cursor-not-allowed disabled:opacity-70",
        character.isLive && "hover:shadow-[var(--shadow-md)]",
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, var(${character.colorToken}) 30%, var(--color-border))`,
      }}
    >
      <CharacterAvatar character={character} size="lg" />
      <div>
        <p className="text-base font-bold text-[color:var(--color-ink)]">{character.name}</p>
        <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">{role}</p>
      </div>
      {!character.isLive ? <Badge variant="neutral">{comingSoonLabel}</Badge> : null}
    </motion.button>
  );
}
