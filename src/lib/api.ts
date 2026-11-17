import { NextResponse } from "next/server";
import { AuthError, requireSession } from "@/lib/auth";
import { assertSameOrigin, ForbiddenError } from "@/lib/security";

/** For read-only (GET) routes: just requires an authenticated session. */
export async function requireAdminRead(): Promise<string> {
  return requireSession();
}

/** For mutating routes: requires same-origin AND an authenticated session. */
export async function requireAdminWrite(request: Request): Promise<string> {
  assertSameOrigin(request);
  return requireSession();
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
