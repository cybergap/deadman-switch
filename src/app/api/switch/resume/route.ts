import { NextResponse } from "next/server";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import { resumeSwitch } from "@/lib/checkin";

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    await resumeSwitch();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
