import { NextResponse } from "next/server";
import { getAccessToken, getRefreshToken } from "@/lib/auth/server";

/** Cheap cookie-presence check for client bootstrapping. Does not call the backend. */
export async function GET() {
  const [access, refresh] = await Promise.all([getAccessToken(), getRefreshToken()]);
  const authenticated = Boolean(access || refresh);
  return NextResponse.json({ success: true, message: "Success", data: { authenticated } });
}
