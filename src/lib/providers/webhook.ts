import type { SendResult } from "./types";

export async function callWebhook(opts: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): Promise<SendResult> {
  try {
    const res = await fetch(opts.url, {
      method: opts.method ?? "POST",
      headers: { "Content-Type": "application/json", ...opts.headers },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, error: `Webhook responded with status ${res.status}.` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown webhook error.",
    };
  }
}
