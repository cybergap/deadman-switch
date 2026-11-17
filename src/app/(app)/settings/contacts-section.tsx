"use client";

import { useState } from "react";
import type { ContactData } from "./types";

type FormState = { name: string; relationship: string; email: string; phone: string };
const EMPTY: FormState = { name: "", relationship: "", email: "", phone: "" };

export function ContactsSection({
  contacts,
  onChange,
}: {
  contacts: ContactData[];
  onChange: (contacts: ContactData[]) => void;
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

  function startEdit(contact: ContactData) {
    setEditingId(contact.id);
    setAdding(false);
    setForm({
      name: contact.name,
      relationship: contact.relationship ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
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
      const url = editingId ? `/api/contacts/${editingId}` : "/api/contacts";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save contact.");
        return;
      }
      if (editingId) {
        onChange(contacts.map((c) => (c.id === editingId ? { ...c, ...form, relationship: form.relationship || null, email: form.email || null, phone: form.phone || null } : c)));
      } else {
        onChange([...contacts, data]);
      }
      cancel();
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this contact? Any actions using them will stop working.")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) onChange(contacts.filter((c) => c.id !== id));
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        {contacts.length === 0 && !showForm && (
          <p className="text-sm text-muted">
            No contacts yet. Add the people who should be notified if you don&apos;t check in.
          </p>
        )}
        <ul className="divide-y divide-border">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {contact.name}
                  {contact.relationship && (
                    <span className="ml-2 text-xs text-muted">{contact.relationship}</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact info"}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => startEdit(contact)} className="text-accent hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(contact.id)} className="text-danger hover:underline">
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
            + Add contact
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Relationship (optional)"
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone (e.g. +15551234567)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending || !form.name}
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
