import { NextResponse, type NextRequest } from "next/server";
import {
  ensureFreshAccessToken,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
} from "@/lib/auth/server";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";

/**
 * Reports whether the caller has a session worth acting on for client
 * bootstrapping (e.g. deciding whether to fetch the user's profile).
 *
 * Not the real security boundary — that remains the BFF's own per-request
 * authorization (`app/api/bff/[...path]/route.ts`), which this endpoint
 * cannot weaken or substitute for. It previously reported `authenticated`
 * from cookie *presence* alone: a refresh cookie that had actually expired
 * or been revoked still read as `true`, no backend call ever made. Nothing
 * in this app used that as a hard gate — proxy.ts no longer redirects on
 * cookie presence either (see its own comment) — but a client that trusted
 * this endpoint's word had no way to know it was wrong until a downstream
 * call failed on its own.
 *
 * When an access token is present, it is reported as-is without a network
 * call: that is the common case, a fresh access token is short-lived and
 * cheap to just try using (any consumer that actually needs data already
 * goes through the BFF, which refreshes-and-retries-once on a 401 itself).
 * The one case genuinely worth a real check is exactly the stale-cookie
 * scenario this was built to close: no access token, but a refresh cookie
 * that *looks* present. `refreshAccessToken()` is the same function the BFF
 * itself uses to decide this for real — a definite rejection clears the
 * cookies and reports `false`; an operational outage (backend down, not the
 * token being invalid) must not be reported as a confirmed `false`, so it
 * falls back to `false` for this endpoint's purposes without touching the
 * cookies, leaving them for a later retry rather than treating a transient
 * failure as proof of an invalid session.
 */
/** Upper bound for `minValiditySeconds`: the access token lives 30 minutes. */
const MAX_MIN_VALIDITY_SECONDS = 25 * 60;

export async function GET(request?: NextRequest) {
  // `?minValiditySeconds=N`: renew now unless the access token outlives N
  // seconds. An upload asks for this before it starts, so it never needs a
  // refresh while its body is still arriving.
  const minValidity = Number(request?.nextUrl.searchParams.get("minValiditySeconds") ?? 0);
  if (Number.isFinite(minValidity) && minValidity > 0) {
    let authenticated = false;
    try {
      authenticated = Boolean(
        await ensureFreshAccessToken(Math.min(minValidity, MAX_MIN_VALIDITY_SECONDS)),
      );
    } catch {
      authenticated = false; // outage, not an invalid session (see above)
    }
    return NextResponse.json(
      { success: true, message: "Success", data: { authenticated } },
      { headers: NO_STORE_HEADERS },
    );
  }

  const access = await getAccessToken();
  if (access) {
    return NextResponse.json(
      { success: true, message: "Success", data: { authenticated: true } },
      { headers: NO_STORE_HEADERS },
    );
  }

  const refresh = await getRefreshToken();
  let authenticated = false;
  if (refresh) {
    try {
      authenticated = Boolean(await refreshAccessToken());
    } catch {
      // Operational outage, not a verified-invalid session — see the
      // docstring above. Reported as unauthenticated for this bootstrap
      // check without clearing cookies, so a later retry can still succeed.
      authenticated = false;
    }
  }

  return NextResponse.json(
    { success: true, message: "Success", data: { authenticated } },
    { headers: NO_STORE_HEADERS },
  );
}
