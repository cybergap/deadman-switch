import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, errorResponse } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireAdminRead();
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = Number(url.searchParams.get("limit") ?? "30");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;

    const events = await prisma.eventLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;

    return NextResponse.json({
      events: page.map((event) => ({
        id: event.id,
        cycleId: event.cycleId,
        type: event.type,
        detail: event.detail ? safeParse(event.detail) : null,
        createdAt: event.createdAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
