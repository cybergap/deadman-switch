import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { LogClient, type LogEvent } from "./log-client";

const PAGE_SIZE = 30;

export default async function LogPage() {
  await requireSession();

  const events = await prisma.eventLog.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  });
  const hasMore = events.length > PAGE_SIZE;
  const page = hasMore ? events.slice(0, PAGE_SIZE) : events;

  const initialEvents: LogEvent[] = page.map((e) => ({
    id: e.id,
    type: e.type,
    detail: e.detail ? safeParse(e.detail) : null,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Activity log</h1>
      <LogClient
        initialEvents={initialEvents}
        initialNextCursor={hasMore ? page[page.length - 1].id : null}
      />
    </div>
  );
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
