import twilio from "twilio";
import type { SendResult } from "./types";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!client) client = twilio(sid, token);
  return client;
}

export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<SendResult> {
  const from = process.env.TWILIO_SMS_FROM_NUMBER;
  const twilioClient = getClient();

  if (!twilioClient || !from) {
    console.log(`[dry-run sms] to=${opts.to}\n${opts.body}`);
    return { ok: true, dryRun: true };
  }

  try {
    const message = await twilioClient.messages.create({
      to: opts.to,
      from,
      body: opts.body,
    });
    return { ok: true, providerId: message.sid };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown SMS error.",
    };
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function makeVoiceCall(opts: {
  to: string;
  message: string;
}): Promise<SendResult> {
  const from =
    process.env.TWILIO_VOICE_FROM_NUMBER ?? process.env.TWILIO_SMS_FROM_NUMBER;
  const twilioClient = getClient();

  if (!twilioClient || !from) {
    console.log(`[dry-run call] to=${opts.to}\n${opts.message}`);
    return { ok: true, dryRun: true };
  }

  try {
    const twiml = `<Response><Say voice="Polly.Joanna-Neural">${escapeXml(
      opts.message
    )}</Say></Response>`;
    const call = await twilioClient.calls.create({
      to: opts.to,
      from,
      twiml,
    });
    return { ok: true, providerId: call.sid };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown call error.",
    };
  }
}
