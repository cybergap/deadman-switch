import { z } from "zod";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, requireAdminWrite, errorResponse } from "@/lib/api";
import { decryptField, encryptField } from "@/lib/crypto";

const schema = z.object({
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(32).optional().nullable(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(10).max(200).optional(),
});

export async function GET() {
  try {
    const userId = await requireAdminRead();
    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    return NextResponse.json({
      email: user.email,
      phone: user.encryptedPhone ? decryptField(user.encryptedPhone) : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireAdminWrite(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const data: { email: string; encryptedPhone: string | null; passwordHash?: string } = {
      email: body.data.email,
      encryptedPhone: body.data.phone ? encryptField(body.data.phone) : null,
    };

    if (body.data.newPassword) {
      if (!body.data.currentPassword) {
        return NextResponse.json(
          { error: "Enter your current password to set a new one." },
          { status: 400 }
        );
      }
      const ok = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
      }
      data.passwordHash = await bcrypt.hash(body.data.newPassword, 12);
    }

    await prisma.adminUser.update({ where: { id: userId }, data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
    return errorResponse(error);
  }
}
