import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, errorResponse } from "@/lib/api";

const schema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.data.endpoint },
      create: {
        endpoint: body.data.endpoint,
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
      },
      update: {
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
