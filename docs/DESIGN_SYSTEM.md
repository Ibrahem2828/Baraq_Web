# Baraq Web — Design System

## 1. Source of truth for tokens

Light and dark theme values in `src/design-system/tokens.css` are copied **verbatim**
from `Baraq_Website/css/style.css`'s `:root` block (the live marketing site's brand
tokens), which the brand team sampled directly from the character artwork and the logo
— not invented for this project. The **"fire" theme is new to this codebase**: the
marketing site has no third theme, so its values are ported from the mobile app's
`Baraq-App/src/theme/themes.ts` `"fire"` theme (already shipped in production on mobile)
and re-expressed under the same semantic token names used here.

## 2. Token layers

```
design-system/tokens.css   →  raw CSS custom properties, one block per theme
app/globals.css  @theme inline  →  maps tokens.css vars into Tailwind's theme so
                                    `bg-[color:var(--color-surface)]` etc. work,
                                    and so future utility classes could be added
                                    for these colors if needed
```

Semantic categories, each with a light/dark/fire value:

| Category | Tokens |
|---|---|
| Backgrounds | `--color-bg`, `--color-bg-soft` |
| Surfaces | `--color-surface`, `--color-surface-2`, `--color-surface-elevated` |
| Text | `--color-ink`, `--color-ink-soft`, `--color-ink-faint`, `--color-ink-inverse` |
| Borders | `--color-border`, `--color-border-strong` |
| Brand accent | `--color-accent`, `--color-accent-solid`, `--color-accent-contrast` |
| Semantic | `--color-{success,warning,destructive,info}` (+ `-bg` tint variants) |
| Character identity | `--color-character-{fahes,khota,rasheed,sada,kholasa}` |
| Shape | `--radius-{sm,md,lg,full}` |
| Elevation | `--shadow-{sm,md}` |
| Motion | `--ease-brand`, `--duration-{fast,normal,slow}` |
| Typography | `--font-display`, `--font-body` (locale-aware, see §4) |

Components reference tokens via Tailwind's arbitrary-value syntax
(`text-[color:var(--color-ink-soft)]`) rather than hardcoded hex — this is what makes
theme switching (`data-theme="dark"|"fire"` on `<html>`, or unset for system preference)
apply instantly with zero per-component theme logic.

## 3. Theme switching mechanics

- Default: no `data-theme` attribute → `@media (prefers-color-scheme: dark)` decides
  light vs. dark automatically.
- Explicit: `useThemeStore` (`src/stores/theme-store.ts`, Zustand + `persist` to
  `localStorage` under key `baraq_theme`) sets `data-theme="light"|"dark"|"fire"` on
  `document.documentElement`.
- `src/design-system/ThemeScript.tsx` is a blocking inline `<script>` in `<head>` that
  reads the persisted preference and applies the attribute **before first paint** —
  this is what prevents a flash of the wrong theme. Its content is a static string with
  no user-controlled interpolation, so `dangerouslySetInnerHTML` there does not introduce
  an XSS surface.

## 4. Typography

Fonts are loaded via `next/font/google` (`src/design-system/fonts.ts`), self-hosted at
build time — zero runtime `<link>` tags, zero layout shift, unlike the marketing site's
runtime Google Fonts `<link>`. Matches the marketing site's family choices exactly:

| Locale | Display font | Body font |
|---|---|---|
| Arabic (`ar`, default) | Almarai (400/700/800) | IBM Plex Sans Arabic (400/500/600/700) |
| English (`en`) | Poppins (500/600/700) | IBM Plex Sans (400/500/600) |

`html[lang="en"]` overrides `--font-display`/`--font-body` in `tokens.css`; everything
else (spacing, radii, motion) is shared across locales.

## 5. RTL / LTR

- Arabic is the default locale and renders `dir="rtl"`; English renders `dir="ltr"` — set
  once on `<html>` in `src/app/[locale]/layout.tsx`, not toggled at runtime (there is no
  scenario in this app where direction changes without a full locale navigation).
- Every component uses **CSS logical properties** exclusively: `ps-`/`pe-`
  (padding-inline-start/end), `ms-`/`me-` (margin-inline-start/end), `start-`/`end-` /
  `inset-inline-*`, `border-s`/`border-e`. Grep the codebase for `\bleft-\d` / `\bright-\d`
  / `pl-\d` / `pr-\d` in component files — there should be none outside truly
  direction-agnostic cases (e.g. `env(safe-area-inset-*)`, which is physical by nature).
- The one place a logical property has no direct CSS equivalent is `transform:
  translateX()` (used for the Drawer's slide-in animation) — `app/globals.css` defines
  the animation twice (`slide-in-from-left`/`slide-in-from-right`) and selects between
  them with the `:dir(rtl)`/`:dir(ltr)` pseudo-class, so the Drawer slides in from the
  correct physical edge in both directions. See the comment block above those keyframes
  in `globals.css` if extending this pattern to a new component.

## 6. Motion system

`src/components/motion/`:

- `variants.ts` — shared `motion/react` variants (`fadeIn`, `slideUp`, `scaleIn`,
  `staggeredContainer`) and duration/easing constants ported from the mobile app's
  `src/theme/motion.ts` (`motionDurations`, the `cubic-bezier(.2,.8,.2,1)` "brand" ease
  also used on the marketing site).
- `FadeIn.tsx` — `<FadeIn preset="fade"|"slide-up"|"scale">` and `<StaggerIn>` /
  `<StaggerItem>` for card grids. Both check `useReducedMotion()` first and render a
  plain, unanimated `<div>` when the user has `prefers-reduced-motion: reduce` set —
  motion is never load-bearing for seeing content.
- Trivial hover/press states (button brightness, focus rings) are plain CSS
  transitions using the `--duration-fast`/`--ease-brand` tokens — `motion/react` is
  reserved for entrance choreography and staggering, where CSS alone would be awkward.

## 7. Component inventory

`src/components/ui/`: Button, IconButton, Input, PasswordInput, Textarea, Select, Card
(+Header/Title/Description/Content/Footer), Badge, Chip, Avatar, Divider, Progress,
Modal, Drawer, Tooltip, Dropdown, Tabs, Skeleton (+CardSkeleton), ConfirmationDialog,
PageHeader, SectionHeader.

`src/components/feedback/`: EmptyState, ErrorState, LoadingState, OfflineBanner, Toast
(+`useToast()`).

All of the above support: keyboard navigation (native where possible — e.g. `Select` is a
real `<select>`, not a hand-rolled listbox, for free OS-native accessibility; Radix for
anything that genuinely needs custom behavior — Dialog, DropdownMenu, Tabs, Tooltip,
Avatar, Progress), `:focus-visible` rings using `--color-accent-solid`, `disabled` states,
loading states (`Button`'s `loading` prop), inline error rendering (`Input`/`Textarea`/
`Select`'s `error` prop), and RTL via logical properties. Responsive sizing is handled by
each component's own Tailwind classes plus the surrounding page layout — there is no
separate "mobile variant" component; the same component adapts.

## 8. Assets — planned layout (Phase 2)

Phase 1 intentionally ships **no final character/brand artwork** — `CharacterAvatar`
renders a colored initial disc, `Logo`/`LogoMark` render text, both clearly marked in
code comments as placeholders. The directory structure Phase 2 will fill in already
exists (with `.gitkeep` placeholders) so asset PRs are pure additions, no restructuring:

```
public/assets/
  characters/{khota,fahes,rasheed,kholasa,sada}/   # full.webp + alt.webp per character,
                                                     # mirroring Baraq_Website/assets/characters/
  logos/            # wordmark, icon-only, light/dark lockups
  backgrounds/
  illustrations/
  icons/
  empty-states/
  animations/
```

Character metadata (canonical name, color token, live/coming-soon flag, backend
task_type) is centralized and typed in `src/config/characters.ts` — swapping in real
artwork later only touches `CharacterAvatar`/`CharacterCard`, not this config or any page.
