"use client";

import { useState } from "react";
import type { ProfileData } from "./types";

export function ProfileSection({ initial }: { initial: ProfileData }) {
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: phone || null,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-surface p-6">
      <div>
        <label className="block text-sm font-medium text-foreground">Email</label>
        <p className="text-xs text-muted">Used for sign-in and, if enabled, check-in emails.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground">Phone</label>
        <p className="text-xs text-muted">Used for check-in text messages, if enabled.</p>
        <input
          placeholder="+15551234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-border pt-4">
        <label className="block text-sm font-medium text-foreground">Change password</label>
        <p className="text-xs text-muted">Leave blank to keep your current password.</p>
        <div className="mt-1 space-y-2">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="New password (min 10 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>
    </div>
  );
}
