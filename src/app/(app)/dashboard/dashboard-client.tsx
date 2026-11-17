"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { describeDuration, type DurationUnit } from "@/lib/time";

export type CycleStatus = "waiting" | "escalating" | "concluded" | "resolved";

export type StatusPayload = {
  schedule: {
    intervalValue: number;
    intervalUnit: DurationUnit;
    graceValue: number;
    graceUnit: DurationUnit;
    checkInChannels: string[];
    timezone: string;
    isPaused: boolean;
  };
  cycle: {
    status: CycleStatus;
    startedAt: string;
    dueAt: string;
    nextStepAt: string | null;
    currentStepIndex: number;
  } | null;
  stepCount: number;
  contactCount: number;
  hasEverStarted: boolean;
};

function formatCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const STATUS_LABELS: Record<CycleStatus, string> = {
  waiting: "Waiting for check-in",
  escalating: "Escalating — trying to reach you",
  concluded: "Concluded — contacts notified",
  resolved: "Resolved",
};

export function DashboardClient({ initialStatus }: { initialStatus: StatusPayload }) {
  const [status, setStatus] = useState(initialStatus);
  const [, forceTick] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // Ignore transient network errors; next poll will retry.
    }
  }, []);

  useEffect(() => {
    const pollId = setInterval(refresh, 15_000);
    const tickId = setInterval(() => forceTick((n) => n + 1), 1_000);
    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [refresh]);

  async function callAction(path: string, successMessage: string) {
    setPending(path);
    setMessage(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong.");
        return;
      }
      setMessage(successMessage);
      await refresh();
    } finally {
      setPending(null);
    }
  }

  const { cycle, schedule } = status;

  const notReady = status.stepCount === 0 || status.contactCount === 0;

  const toneClass = useMemo(() => {
    if (!cycle) return "bg-muted/15 text-muted";
    if (cycle.status === "escalating") return "bg-warning/15 text-warning";
    if (cycle.status === "concluded") return "bg-danger/15 text-danger";
    return "bg-success/15 text-success";
  }, [cycle]);

  return (
    <div className="space-y-6">
      {notReady && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          <p>
            {status.contactCount === 0 && "Add at least one contact before activating. "}
            {status.stepCount === 0 && "Add at least one escalation step before activating. "}
            <Link href="/settings" className="text-accent underline">
              Go to Settings
            </Link>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>
              {schedule.isPaused ? "Paused" : cycle ? STATUS_LABELS[cycle.status] : "Not started"}
            </span>
          </div>
        </div>

        <div className="mt-6">
          {schedule.isPaused ? (
            <p className="text-sm text-muted">
              The switch is paused. Nothing will be sent until you activate it.
            </p>
          ) : cycle?.status === "waiting" ? (
            <div>
              <p className="text-sm text-muted">Check in before</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                {formatCountdown(cycle.dueAt)}
              </p>
              <p className="mt-1 text-xs text-muted">
                or escalation begins automatically
              </p>
            </div>
          ) : cycle?.status === "escalating" ? (
            <div>
              <p className="text-sm text-muted">
                Deadline missed. {cycle.nextStepAt ? "Next escalation step in" : "Waiting on escalation steps"}
              </p>
              {cycle.nextStepAt && (
                <p className="mt-1 text-3xl font-semibold tabular-nums text-warning">
                  {formatCountdown(cycle.nextStepAt)}
                </p>
              )}
            </div>
          ) : cycle?.status === "concluded" ? (
            <p className="text-sm text-muted">
              The escalation ladder finished and your contacts were notified. If you&apos;re
              back, confirm below to reset and resume normal checks.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Not started yet. Activate the switch once you&apos;ve added contacts and
              escalation steps in Settings.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!schedule.isPaused && cycle && cycle.status !== "resolved" && (
            <button
              onClick={() => callAction("/api/checkin/confirm", "Checked in — you're all set.")}
              disabled={pending !== null}
              className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              I&apos;m OK — check in
            </button>
          )}
          {schedule.isPaused ? (
            <button
              onClick={() => callAction("/api/switch/resume", "Activated.")}
              disabled={pending !== null || notReady}
              title={notReady ? "Add a contact and an escalation step first." : undefined}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {status.hasEverStarted ? "Resume" : "Activate"}
            </button>
          ) : (
            <button
              onClick={() => callAction("/api/switch/pause", "Paused.")}
              disabled={pending !== null}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
            >
              Pause
            </button>
          )}
        </div>

        {message && <p className="mt-4 text-sm text-muted">{message}</p>}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
        <p>
          Checking in every {describeDuration(schedule.intervalValue, schedule.intervalUnit)},
          with {describeDuration(schedule.graceValue, schedule.graceUnit)} to respond before
          escalation begins.{" "}
          <Link href="/settings" className="text-accent underline">
            Change schedule
          </Link>
        </p>
      </div>
    </div>
  );
}
