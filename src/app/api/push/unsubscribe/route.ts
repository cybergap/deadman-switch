import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, errorResponse } from "@/lib/api";

const schema = z.object({ endpoint: z.string().url().max(2000) });

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    await prisma.pushSubscription
      .delete({ where: { endpoint: body.data.endpoint } })
      .catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
