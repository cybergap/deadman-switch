import { Resend } from "resend";
import type { SendResult } from "./types";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  const from = process.env.RESEND_FROM_EMAIL;
  const resend = getClient();

  if (!resend || !from) {
    console.log(
      `[dry-run email] to=${opts.to} subject="${opts.subject}"\n${opts.text}`
    );
    return { ok: true, dryRun: true };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, providerId: result.data?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
}
