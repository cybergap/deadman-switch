import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import { resequenceSteps } from "@/lib/escalation-steps";

const schema = z.object({
  orderedIds: z.array(z.string().min(1).max(100)).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid reorder request." }, { status: 400 });
    }

    const count = await prisma.escalationStep.count();
    if (body.data.orderedIds.length !== count) {
      return NextResponse.json(
        { error: "The reorder list must include every escalation step." },
        { status: 400 }
      );
    }

    await resequenceSteps(body.data.orderedIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
