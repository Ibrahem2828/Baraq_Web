/**
 * Static asset registry. Every entry is an ES `import` of a real file under
 * `src/assets/` (Next.js/Turbopack resolves these at build time into an
 * optimized `next/image`-compatible object with inferred width/height — the
 * same mechanism `next/image` uses for any statically-imported image).
 *
 * Only what the UI renders is imported. Every import here is emitted into
 * `.next/static/media` (and so into the Docker image, and into any bundled
 * mobile build) whether or not a component uses it: the previous registry
 * imported all 70 illustrations and put 94MB of unused PNGs into every
 * build. The other files stay on disk (see docs/ASSET_INVENTORY.md); add an
 * import back here when a screen starts using one.
 */
// WebP derivatives, sized for how they are shown: the logo renders 36px
// tall (288px covers 8x), the auth background at 15% opacity. Made with
// sharp from the PNG masters that sit beside them.
import logoBaraqArabicTransparent from "./logos/logo_baraq_arabic_transparent.webp";
import bgHomeSoftGems from "./images/backgrounds/bg_home_soft_gems.webp";

// Normalised avatars: every figure cropped to its outline and placed at the
// same height on the same 512px canvas, so the five read as one set.
import khotaAvatar from "./characters/khota/character_khota_avatar.webp";
import fahesAvatar from "./characters/fahes/character_fahes_avatar.webp";
import rasheedAvatar from "./characters/rasheed/character_rasheed_avatar.webp";
import kholasaAvatar from "./characters/kholasa/character_kholasa_avatar.webp";
import sadaAvatar from "./characters/sada/character_sada_avatar.webp";

export const assets = {
  logos: {
    arabicTransparent: logoBaraqArabicTransparent,
  },
  backgrounds: {
    homeSoftGems: bgHomeSoftGems,
  },
  characters: {
    khota: { avatar: khotaAvatar },
    fahes: { avatar: fahesAvatar },
    rasheed: { avatar: rasheedAvatar },
    kholasa: { avatar: kholasaAvatar },
    sada: { avatar: sadaAvatar },
  },
} as const;

export type CharacterAssetKey = keyof typeof assets.characters;
