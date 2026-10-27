import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";

export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200, headers: NO_STORE_HEADERS });
}
