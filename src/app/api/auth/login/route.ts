import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { login, validateMutationCsrf } from "@/lib/auth/server";
import { NO_STORE_HEADERS } from "@/lib/http/no-store";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Dedicated route (not the generic BFF proxy) because a successful login
 * response carries `{access, refresh, user}` that must be split: the tokens
 * are written to HttpOnly cookies here and never returned to the client, only
 * `user` is sent back in the JSON body.
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

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // Forward the backend's real error envelope (message/code/errors) as-is —
    // same principle as the generic BFF proxy — instead of collapsing every
    // failure (wrong password, unverified email, rate limit, server error)
    // into one hardcoded message.
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
