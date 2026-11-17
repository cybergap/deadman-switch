import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, requireAdminWrite, errorResponse } from "@/lib/api";
import { DURATION_UNITS } from "@/lib/constants";
import { getOrderedStepsWithActions, serializeStep } from "@/lib/escalation-steps";

const schema = z.object({
  label: z.string().trim().min(1).max(100),
  delayValue: z.number().int().min(0).max(3650),
  delayUnit: z.enum(DURATION_UNITS),
  isFinal: z.boolean().optional().default(false),
  actionIds: z.array(z.string().min(1).max(100)).max(50).default([]),
});

export async function GET() {
  try {
    await requireAdminRead();
    const steps = await getOrderedStepsWithActions();
    return NextResponse.json(steps.map(serializeStep));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid escalation step." }, { status: 400 });
    }

    const count = await prisma.escalationStep.count();
    const step = await prisma.escalationStep.create({
      data: {
        order: count + 1,
        label: body.data.label,
        delayValue: body.data.delayValue,
        delayUnit: body.data.delayUnit,
        isFinal: body.data.isFinal,
        actions: {
          create: body.data.actionIds.map((actionId) => ({ actionId })),
        },
      },
      include: { actions: { include: { action: true } } },
    });

    return NextResponse.json(serializeStep(step), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
