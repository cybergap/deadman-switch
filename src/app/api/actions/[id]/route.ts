import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import {
  actionInputSchema,
  prepareActionData,
  serializeAction,
  ActionValidationError,
} from "@/lib/action-config";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminWrite(request);
    const { id } = await params;
    const body = actionInputSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid action details." }, { status: 400 });
    }

    const data = await prepareActionData(body.data);
    const action = await prisma.actionConfig.update({
      where: { id },
      data,
      include: { contact: true },
    });

    return NextResponse.json(serializeAction(action));
  } catch (error) {
    if (error instanceof ActionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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
    await prisma.actionConfig.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
