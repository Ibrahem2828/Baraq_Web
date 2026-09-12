import Script from "next/script";

/**
 * Blocking inline script that applies the persisted theme attribute before
 * first paint, avoiding a flash of the wrong theme. Content is a static
 * string (no user input interpolated), passed as `next/script`'s `children`
 * — no `dangerouslySetInnerHTML` is used, so there's no XSS surface here.
 *
 * Uses `next/script` with `strategy="beforeInteractive"` rather than a raw
 * `<script>` tag — Next's sanctioned mechanism for exactly this "must run
 * before hydration" case (documented for early theme/analytics boot
 * scripts). A hand-written `<script>` placed in `<head>` was previously used
 * here instead and triggered a real hydration mismatch in React 19 (a plain
 * inline script isn't one of the prop shapes React auto-hoists as page
 * metadata, so server and client disagreed about its position in the tree)
 * — verified against a live dev server in Phase 2, not just a lint nitpick.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var raw = window.localStorage.getItem("baraq_theme");
    var preference = raw ? JSON.parse(raw).state.preference : "system";
    if (preference && preference !== "system") {
      document.documentElement.setAttribute("data-theme", preference);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // The `no-before-interactive-script-outside-document` rule only knows the
  // Pages Router's `pages/_document.js` convention; App Router's equivalent
  // — a root layout's own `<html>`/`<head>` (this project has no separate
  // `app/layout.tsx`, so `app/[locale]/layout.tsx` *is* the root layout) —
  // isn't recognized and always trips this rule. `beforeInteractive` in a
  // root layout is Next's own documented, supported pattern:
  // https://nextjs.org/docs/app/api-reference/components/script#beforeinteractive
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-boot" strategy="beforeInteractive">
      {THEME_SCRIPT}
    </Script>
  );
}
