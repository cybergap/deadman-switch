"use client";

import { useState } from "react";

export type LogEvent = {
  id: string;
  type: string;
  detail: unknown;
  createdAt: string;
};

function describe(event: LogEvent): { text: string; tone: "ok" | "warning" | "danger" | "neutral" } {
  const detail = (event.detail ?? {}) as Record<string, unknown>;
  switch (event.type) {
    case "cycle_started":
      return { text: "Check-in requested", tone: "neutral" };
    case "checkin_sent":
      return { text: `Check-in sent via ${detail.channel ?? "?"}`, tone: "neutral" };
    case "checkin_sent_skipped":
      return { text: `Check-in skipped via ${detail.channel ?? "?"} — not configured`, tone: "warning" };
    case "checkin_send_failed":
      return { text: `Failed to send check-in via ${detail.channel ?? "?"}: ${detail.error ?? ""}`, tone: "danger" };
    case "checkin_confirmed":
      return { text: "Checked in — all good", tone: "ok" };
    case "escalation_started":
      return { text: "Deadline missed — escalation started", tone: "warning" };
    case "escalation_started_no_steps":
      return { text: "Deadline missed — but no escalation steps are configured", tone: "danger" };
    case "step_fired":
      return { text: `Escalation step fired: ${detail.label ?? ""}`, tone: "warning" };
    case "cycle_concluded":
      return { text: "Escalation ladder finished — contacts notified", tone: "danger" };
    case "paused":
      return { text: "Switch paused", tone: "neutral" };
    case "resumed":
      return { text: "Switch activated", tone: "ok" };
    default:
      return { text: event.type, tone: "neutral" };
  }
}

const TONE_CLASS: Record<string, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted",
};

export function LogClient({
  initialEvents,
  initialNextCursor,
}: {
  initialEvents: LogEvent[];
  initialNextCursor: string | null;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events?cursor=${cursor}&limit=30`);
      const data = await res.json();
      setEvents((prev) => [...prev, ...data.events]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted">Nothing has happened yet.</p>;
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {events.map((event) => {
          const { text, tone } = describe(event);
          return (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_CLASS[tone]}`} />
              <div>
                <p className="text-sm text-foreground">{text}</p>
                <p className="text-xs text-muted">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {cursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-background disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
