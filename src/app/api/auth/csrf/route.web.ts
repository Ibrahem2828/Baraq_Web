import { NextResponse } from "next/server";
import { ensureCsrfCookie } from "@/lib/auth/server";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";

/** Issues (or returns the existing) CSRF token cookie. Called once on app bootstrap. */
export async function GET() {
  const csrfToken = await ensureCsrfCookie();
  return NextResponse.json(
    { success: true, message: "Success", data: { csrfToken } },
    { headers: NO_STORE_HEADERS },
  );
}
