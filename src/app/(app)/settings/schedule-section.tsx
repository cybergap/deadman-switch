"use client";

import { useState } from "react";
import { DURATION_UNITS, CHECKIN_CHANNELS } from "@/lib/constants";
import type { ScheduleData } from "./types";

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "Text message",
  push: "Push notification",
};

export function ScheduleSection({ initial }: { initial: ScheduleData }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleChannel(channel: string) {
    setForm((f) => ({
      ...f,
      checkInChannels: f.checkInChannels.includes(channel)
        ? f.checkInChannels.filter((c) => c !== channel)
        : [...f.checkInChannels, channel],
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setMessage(res.ok ? "Saved." : data.error ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-surface p-6">
      <div>
        <label className="block text-sm font-medium text-foreground">Check in every</label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            min={1}
            value={form.intervalValue}
            onChange={(e) => setForm((f) => ({ ...f, intervalValue: Number(e.target.value) }))}
            className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={form.intervalUnit}
            onChange={(e) =>
              setForm((f) => ({ ...f, intervalUnit: e.target.value as ScheduleData["intervalUnit"] }))
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {DURATION_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">
          Grace period before escalating
        </label>
        <p className="text-xs text-muted">How long you have to respond after a check-in is sent.</p>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            min={1}
            value={form.graceValue}
            onChange={(e) => setForm((f) => ({ ...f, graceValue: Number(e.target.value) }))}
            className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={form.graceUnit}
            onChange={(e) =>
              setForm((f) => ({ ...f, graceUnit: e.target.value as ScheduleData["graceUnit"] }))
            }
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {DURATION_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Check in by</label>
        <div className="mt-2 flex flex-wrap gap-4">
          {CHECKIN_CHANNELS.map((channel) => (
            <label key={channel} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.checkInChannels.includes(channel)}
                onChange={() => toggleChannel(channel)}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              {CHANNEL_LABELS[channel]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Text requires a phone number and push requires enabling notifications — both set up
          under Profile / Notifications.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Timezone</label>
        <div className="mt-1 flex gap-2">
          <input
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }))
            }
            className="shrink-0 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-background"
          >
            Use this device&apos;s
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save schedule"}
        </button>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>
    </div>
  );
}
