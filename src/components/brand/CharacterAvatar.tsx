import Image from "next/image";
import type { CharacterDefinition } from "@/config/characters";
import { assets } from "@/assets/assets";
import { cn } from "@/lib/utils/cn";

const SIZE_PX = { sm: 36, md: 48, lg: 64, xl: 96 } as const;

/* Corner softness tracks size: the same radius that reads as a rounded
   square at 96px reads as a circle at 36px. */
const RADIUS = {
  sm: "rounded-[10px]",
  md: "rounded-[12px]",
  lg: "rounded-[var(--radius-sm)]",
  xl: "rounded-[var(--radius-md)]",
} as const;

/**
 * Real character artwork (Phase 2 — `src/assets/characters/<key>/`, the
 * same illustrations the mobile app ships), in a soft-square frame tinted
 * with the character's own colour. See docs/ASSET_INVENTORY.md.
 *
 * A soft square rather than a disc. These are full-body illustrations, and
 * a circle is the one frame that cuts a standing figure at the knees and
 * the shoulders at the same time: the more of the artwork you fit, the
 * smaller the character gets inside it. The square also lets the five read
 * as one set beside each other rather than as five generic profile
 * pictures, which is the whole point of having drawn them.
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
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        RADIUS[size],
        sizeClass,
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, var(${character.colorToken}) 16%, var(--color-bg-soft))`,
        // A hairline of the character's own colour, so the frame belongs to
        // them rather than to the card it happens to sit on.
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(${character.colorToken}) 28%, transparent)`,
      }}
    >
      <Image
        src={assets.characters[character.key].avatar}
        alt=""
        width={px}
        height={px}
        // The avatar files are normalised (same canvas, figure height and
        // baseline -- see the assets map), so one fit works for all five.
        // The full artwork had different margins per character, which is why
        // the five used to look like different sizes in identical frames.
        className="size-full object-contain p-[6%]"
      />
    </span>
  );
}
