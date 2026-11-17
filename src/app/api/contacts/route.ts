import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, requireAdminWrite, errorResponse } from "@/lib/api";
import { decryptField, encryptField } from "@/lib/crypto";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(32).optional().nullable().or(z.literal("")),
});

function serialize(contact: {
  id: string;
  name: string;
  relationship: string | null;
  encryptedEmail: string | null;
  encryptedPhone: string | null;
  createdAt: Date;
}) {
  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    email: contact.encryptedEmail ? decryptField(contact.encryptedEmail) : null,
    phone: contact.encryptedPhone ? decryptField(contact.encryptedPhone) : null,
    createdAt: contact.createdAt,
  };
}

export async function GET() {
  try {
    await requireAdminRead();
    const contacts = await prisma.contact.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(contacts.map(serialize));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
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

    const contact = await prisma.contact.create({
      data: {
        name: body.data.name,
        relationship: body.data.relationship || null,
        encryptedEmail: body.data.email ? encryptField(body.data.email) : null,
        encryptedPhone: body.data.phone ? encryptField(body.data.phone) : null,
      },
    });

    return NextResponse.json(serialize(contact), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
