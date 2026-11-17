import { z } from "zod";
import { NextResponse } from "next/server";
import { createAdminUser, createSession, hasAdminUser } from "@/lib/auth";
import { assertSameOrigin, ForbiddenError } from "@/lib/security";

const schema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    if (await hasAdminUser()) {
      return NextResponse.json(
        { error: "An admin account already exists." },
        { status: 409 }
      );
    }

    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "Enter a valid email and a password of at least 10 characters." },
        { status: 400 }
      );
    }

    const user = await createAdminUser(body.data.email, body.data.password);
    await createSession(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("setup failed", error);
    return NextResponse.json({ error: "Setup failed." }, { status: 500 });
  }
}
