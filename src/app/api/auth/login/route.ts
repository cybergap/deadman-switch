import { z } from "zod";
import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import { assertSameOrigin, checkRateLimit, ForbiddenError } from "@/lib/security";

const schema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    const rateLimitKey = `login:${body.data.email.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, { max: 8, windowMs: 15 * 60 * 1000 })) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const user = await verifyCredentials(body.data.email, body.data.password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("login failed", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
