"use client";

import { useState } from "react";
import { ACTION_TYPES } from "@/lib/constants";
import type { ActionData, ContactData } from "./types";

const TYPE_LABELS: Record<string, string> = {
  email: "Send email",
  sms: "Send text message",
  call: "Make phone call",
  webhook: "Call a webhook",
  push: "Send push notification",
};

type FormState = {
  label: string;
  type: ActionData["type"];
  contactId: string;
  messageTemplate: string;
  webhookUrl: string;
  webhookMethod: string;
};

const EMPTY: FormState = {
  label: "",
  type: "email",
  contactId: "",
  messageTemplate: "",
  webhookUrl: "",
  webhookMethod: "POST",
};

export function ActionsSection({
  actions,
  contacts,
  onChange,
}: {
  actions: ActionData[];
  contacts: ContactData[];
  onChange: (actions: ActionData[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function startEdit(action: ActionData) {
    setEditingId(action.id);
    setAdding(false);
    setForm({
      label: action.label,
      type: action.type,
      contactId: action.contactId ?? "",
      messageTemplate: action.messageTemplate ?? "",
      webhookUrl: action.webhookConfig?.url ?? "",
      webhookMethod: action.webhookConfig?.method ?? "POST",
    });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const payload = {
        label: form.label,
        type: form.type,
        contactId: ["email", "sms", "call"].includes(form.type) ? form.contactId : null,
        messageTemplate: form.messageTemplate || null,
        webhookConfig:
          form.type === "webhook" ? { url: form.webhookUrl, method: form.webhookMethod } : undefined,
      };
      const url = editingId ? `/api/actions/${editingId}` : "/api/actions";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save action.");
        return;
      }
      if (editingId) {
        onChange(actions.map((a) => (a.id === editingId ? data : a)));
      } else {
        onChange([...actions, data]);
      }
      cancel();
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this action? It will be removed from any escalation steps using it.")) return;
    const res = await fetch(`/api/actions/${id}`, { method: "DELETE" });
    if (res.ok) onChange(actions.filter((a) => a.id !== id));
  }

  const showForm = adding || editingId !== null;
  const needsContact = ["email", "sms", "call"].includes(form.type);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        {actions.length === 0 && !showForm && (
          <p className="text-sm text-muted">
            No actions yet. Actions are what happens at each escalation step — e.g. &quot;email
            Mom&quot; or &quot;call Dad&quot;.
          </p>
        )}
        <ul className="divide-y divide-border">
          {actions.map((action) => (
            <li key={action.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted">
                  {TYPE_LABELS[action.type]}
                  {action.contactName ? ` → ${action.contactName}` : ""}
                  {action.webhookConfig ? ` → ${action.webhookConfig.url}` : ""}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => startEdit(action)} className="text-accent hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(action.id)} className="text-danger hover:underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        {!showForm && (
          <button
            onClick={startAdd}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
          >
            + Add action
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <input
            placeholder="Label (e.g. Call Mom)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ActionData["type"] }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {needsContact && (
            <select
              value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose a contact…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {form.type === "webhook" && (
            <div className="flex gap-2">
              <select
                value={form.webhookMethod}
                onChange={(e) => setForm((f) => ({ ...f, webhookMethod: e.target.value }))}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {["POST", "PUT", "PATCH", "GET"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                placeholder="https://example.com/webhook"
                value={form.webhookUrl}
                onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          <textarea
            placeholder="Custom message (optional). Use {{subject}} and {{message}} as placeholders."
            value={form.messageTemplate}
            onChange={(e) => setForm((f) => ({ ...f, messageTemplate: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending || !form.label || (needsContact && !form.contactId) || (form.type === "webhook" && !form.webhookUrl)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancel}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-background"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
