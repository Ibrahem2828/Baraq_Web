// The app build (scripts/build-native.mjs) or the web one. Read here, not
// imported: Next inlines the literal, so the other build's branch is
// removed from this bundle (see docs/MOBILE_APP.md).
const IS_NATIVE = process.env.NEXT_PUBLIC_BUILD_TARGET === "native";

/** Every list -> detail route in the app. */
export type DetailRoute =
  | "ai-jobs"
  | "library"
  | "library/collections"
  | "projects"
  | "quizzes"
  | "quizzes/attempts"
  | "recommendations"
  | "study-plans"
  | "summaries"
  | "support"
  | "transcriptions";

/**
 * The link to one record's page.
 *
 * The web keeps its path URLs (`/quizzes/4`). The app is a static export
 * with no server to render `/quizzes/<any id>`, so there each detail page is
 * one static page that reads the id from the query (`/quizzes/view?id=4`;
 * see the `view/page.native.tsx` files).
 */
export function detailHref(route: DetailRoute, id: string | number): string {
  return IS_NATIVE ? `/${route}/view?id=${encodeURIComponent(String(id))}` : `/${route}/${id}`;
}
