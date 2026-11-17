import { NextResponse } from "next/server";
import { requireAdminWrite, errorResponse } from "@/lib/api";
import { pauseSwitch } from "@/lib/checkin";

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    await pauseSwitch();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
