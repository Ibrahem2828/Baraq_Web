/**
 * Validates a redirect target came from our own app (e.g. the `?next=`
 * query param the proxy sets before bouncing an unauthenticated visitor to
 * `/login`) rather than an attacker-controlled open-redirect target.
 *
 * `next.startsWith("/")` alone (what this project's login page originally
 * used) is not sufficient — `//evil.com` and `/\evil.com` both start with a
 * single `/` but are protocol-relative URLs browsers will happily navigate
 * to a different origin. Found and fixed in Phase 2's security review.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.startsWith("/\\")) return false;
  if (path.includes("://")) return false;
  return true;
}
