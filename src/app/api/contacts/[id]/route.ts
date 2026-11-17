import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import { encryptField } from "@/lib/crypto";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(32).optional().nullable().or(z.literal("")),
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
      return NextResponse.json({ error: "Invalid contact details." }, { status: 400 });
    }
    if (!body.data.email && !body.data.phone) {
      return NextResponse.json(
        { error: "Add an email or phone number for this contact." },
        { status: 400 }
      );
    }

    await prisma.contact.update({
      where: { id },
      data: {
        name: body.data.name,
        relationship: body.data.relationship || null,
        encryptedEmail: body.data.email ? encryptField(body.data.email) : null,
        encryptedPhone: body.data.phone ? encryptField(body.data.phone) : null,
      },
    });

    return NextResponse.json({ ok: true });
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
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
