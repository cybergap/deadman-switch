import { NextResponse } from "next/server";
import { requireAdminRead, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdminRead();
    return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
