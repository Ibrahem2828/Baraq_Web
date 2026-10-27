import { NextResponse, type NextRequest } from "next/server";
import { logout, validateMutationCsrf } from "@/lib/auth/server";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";

export async function POST(request: NextRequest) {
  const csrfOk = await validateMutationCsrf(request);
  if (!csrfOk) {
    return NextResponse.json(
      { success: false, message: "CSRF validation failed", code: "csrf_invalid" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  await logout();
  return NextResponse.json(
    { success: true, message: "Success", data: null },
    { headers: NO_STORE_HEADERS },
  );
}
