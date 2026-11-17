import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { assertSameOrigin, ForbiddenError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
