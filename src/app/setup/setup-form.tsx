"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 10) {
      setError("Use a password of at least 10 characters.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Setup failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-foreground">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
