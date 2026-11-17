import { NextResponse } from "next/server";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import { confirmByAdmin } from "@/lib/checkin";

/** The dashboard's "I'm OK" button. */
export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const result = await confirmByAdmin();
    if (!result.ok) {
      return NextResponse.json({ error: "There's nothing to confirm right now." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
