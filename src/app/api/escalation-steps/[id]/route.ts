import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import { DURATION_UNITS } from "@/lib/constants";
import { resequenceSteps, serializeStep } from "@/lib/escalation-steps";

const schema = z.object({
  label: z.string().trim().min(1).max(100),
  delayValue: z.number().int().min(0).max(3650),
  delayUnit: z.enum(DURATION_UNITS),
  isFinal: z.boolean().optional().default(false),
  actionIds: z.array(z.string().min(1).max(100)).max(50).default([]),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminWrite(request);
    const { id } = await params;
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid escalation step." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.escalationStepAction.deleteMany({ where: { stepId: id } }),
      prisma.escalationStep.update({
        where: { id },
        data: {
          label: body.data.label,
          delayValue: body.data.delayValue,
          delayUnit: body.data.delayUnit,
          isFinal: body.data.isFinal,
          actions: { create: body.data.actionIds.map((actionId) => ({ actionId })) },
        },
      }),
    ]);

    const step = await prisma.escalationStep.findUnique({
      where: { id },
      include: { actions: { include: { action: true } } },
    });
    if (!step) {
      return NextResponse.json({ error: "Step not found." }, { status: 404 });
    }
    return NextResponse.json(serializeStep(step));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminWrite(request);
    const { id } = await params;
    await prisma.escalationStep.delete({ where: { id } });
    await resequenceSteps();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
