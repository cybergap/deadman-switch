import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, requireAdminWrite, errorResponse } from "@/lib/api";
import {
  actionInputSchema,
  prepareActionData,
  serializeAction,
  ActionValidationError,
} from "@/lib/action-config";

export async function GET() {
  try {
    await requireAdminRead();
    const actions = await prisma.actionConfig.findMany({
      orderBy: { createdAt: "asc" },
      include: { contact: true },
    });
    return NextResponse.json(actions.map(serializeAction));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = actionInputSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid action details." }, { status: 400 });
    }

    const data = await prepareActionData(body.data);
    const action = await prisma.actionConfig.create({
      data,
      include: { contact: true },
    });

    return NextResponse.json(serializeAction(action), { status: 201 });
  } catch (error) {
    if (error instanceof ActionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
