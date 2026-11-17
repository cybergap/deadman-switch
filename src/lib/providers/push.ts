import * as webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { SendResult } from "./types";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export async function sendPushToAll(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<SendResult> {
  if (!ensureConfigured()) {
    console.log(`[dry-run push] ${payload.title}: ${payload.body}`);
    return { ok: true, dryRun: true };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    return { ok: false, error: "No push subscriptions are registered." };
  }

  let anyOk = false;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      anyOk = true;
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? (error as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => {});
      }
      errors.push(error instanceof Error ? error.message : "Push error.");
    }
  }

  return anyOk ? { ok: true } : { ok: false, error: errors.join("; ") };
}
