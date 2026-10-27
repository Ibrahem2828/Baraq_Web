import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyEmail, validateMutationCsrf } from "@/lib/auth/server";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

/**
 * Dedicated route (not the generic BFF proxy), same reasoning as
 * `api/auth/login/route.ts`: a successful verification carries
 * `{access, refresh, user}` that must be split into HttpOnly cookies here,
 * never returned to client JS.
 */
export async function POST(request: NextRequest) {
  const csrfOk = await validateMutationCsrf(request);
  if (!csrfOk) {
    return NextResponse.json(
      { success: false, message: "CSRF validation failed", code: "csrf_invalid" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Validation error",
        code: "validation_error",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const result = await verifyEmail(
    parsed.data.email,
    parsed.data.code,
    request.headers.get("x-request-id"),
  );
  if (!result.ok) {
    return NextResponse.json(
      result.body ?? { success: false, message: "Request failed", code: "server_error" },
      { status: result.status, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { success: true, message: "Success", data: { user: result.user } },
    { headers: NO_STORE_HEADERS },
  );
}
