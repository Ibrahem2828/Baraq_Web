import Image from "next/image";
import type { CharacterDefinition } from "@/config/characters";
import { assets } from "@/assets/assets";
import { cn } from "@/lib/utils/cn";

const SIZE_PX = { sm: 36, md: 48, lg: 64, xl: 96 } as const;

/**
 * Real character artwork (Phase 2 — `src/assets/characters/<key>/`, the
 * same illustrations the mobile app ships), on a soft tinted disc in the
 * character's brand color. Phase 1 shipped a plain initial-letter disc here
 * as a documented placeholder; this replaces it now that the real assets
 * are integrated. See docs/ASSET_INVENTORY.md.
 */
export function CharacterAvatar({
  character,
  size = "md",
  className,
}: {
  character: CharacterDefinition;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const px = SIZE_PX[size];
  const sizeClass = { sm: "size-9", md: "size-12", lg: "size-16", xl: "size-24" }[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        sizeClass,
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, var(${character.colorToken}) 18%, var(--color-bg-soft))`,
      }}
    >
      <Image
        src={assets.characters[character.key].full}
        alt=""
        width={px}
        height={px}
        className="size-full object-contain p-1"
      />
    </span>
  );
}
