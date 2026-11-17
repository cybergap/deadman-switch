"use client";

import { useState } from "react";
import { DURATION_UNITS } from "@/lib/constants";
import type { ActionData, StepData } from "./types";

type FormState = {
  label: string;
  delayValue: number;
  delayUnit: StepData["delayUnit"];
  isFinal: boolean;
  actionIds: string[];
};

const EMPTY: FormState = {
  label: "",
  delayValue: 30,
  delayUnit: "minutes",
  isFinal: false,
  actionIds: [],
};

export function EscalationSection({
  initialSteps,
  actions,
}: {
  initialSteps: StepData[];
  actions: ActionData[];
}) {
  const [steps, setSteps] = useState(initialSteps);
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

  function startEdit(step: StepData) {
    setEditingId(step.id);
    setAdding(false);
    setForm({
      label: step.label,
      delayValue: step.delayValue,
      delayUnit: step.delayUnit,
      isFinal: step.isFinal,
      actionIds: step.actions.map((a) => a.id),
    });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function toggleAction(id: string) {
    setForm((f) => ({
      ...f,
      actionIds: f.actionIds.includes(id)
        ? f.actionIds.filter((a) => a !== id)
        : [...f.actionIds, id],
    }));
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const url = editingId ? `/api/escalation-steps/${editingId}` : "/api/escalation-steps";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save step.");
        return;
      }
      setSteps((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? data : s)).sort((a, b) => a.order - b.order)
          : [...prev, data].sort((a, b) => a.order - b.order)
      );
      cancel();
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this escalation step?")) return;
    const res = await fetch(`/api/escalation-steps/${id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = steps
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 }));
      setSteps(remaining);
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = steps.findIndex((s) => s.id === id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const reordered = [...steps];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const withOrder = reordered.map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(withOrder);

    await fetch("/api/escalation-steps/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: withOrder.map((s) => s.id) }),
    });
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        {steps.length === 0 && !showForm && (
          <p className="text-sm text-muted">
            No escalation steps yet. Build a ladder — e.g. text your partner after 30 minutes,
            call your parents after 2 hours, email everyone after 6 hours.
          </p>
        )}
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium text-muted">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {step.label}
                    {step.isFinal && (
                      <span className="ml-2 rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">
                        final
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    after {step.delayValue} {step.delayUnit} →{" "}
                    {step.actions.map((a) => a.label).join(", ") || "no actions"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => move(step.id, -1)}
                  disabled={i === 0}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(step.id, 1)}
                  disabled={i === steps.length - 1}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button onClick={() => startEdit(step)} className="text-accent hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(step.id)} className="text-danger hover:underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
        {!showForm && (
          <button
            onClick={startAdd}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-background"
          >
            + Add step
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <input
            placeholder="Step label (e.g. Notify emergency contacts)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs text-muted">
              Fires this long after the previous step (or after the missed deadline, for the
              first step)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                min={0}
                value={form.delayValue}
                onChange={(e) => setForm((f) => ({ ...f, delayValue: Number(e.target.value) }))}
                className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <select
                value={form.delayUnit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, delayUnit: e.target.value as StepData["delayUnit"] }))
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
            <p className="mb-1 text-xs text-muted">Actions to run at this step</p>
            {actions.length === 0 ? (
              <p className="text-sm text-muted">Add actions first, under the Actions tab.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <label key={action.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={form.actionIds.includes(action.id)}
                      onChange={() => toggleAction(action.id)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    {action.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isFinal}
              onChange={(e) => setForm((f) => ({ ...f, isFinal: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            This is the final step — stop here once it fires
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={pending || !form.label}
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
