import { prisma } from "@/lib/prisma";
import { decryptField, generateToken } from "@/lib/crypto";
import { addDuration, describeDuration, type DurationUnit } from "@/lib/time";
import { sendEmail } from "@/lib/providers/email";
import { sendSms } from "@/lib/providers/sms";
import { sendPushToAll } from "@/lib/providers/push";
import type { ScheduleConfig } from "@/generated/prisma";

const ACTIVE_STATUSES = ["waiting", "escalating"] as const;

export function getBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

export async function getScheduleConfig(): Promise<ScheduleConfig> {
  return prisma.scheduleConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

export function getCheckInChannels(schedule: ScheduleConfig): string[] {
  try {
    const parsed = JSON.parse(schedule.checkInChannels);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getActiveCycle() {
  return prisma.checkInCycle.findFirst({
    where: { status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestCycle() {
  return prisma.checkInCycle.findFirst({ orderBy: { createdAt: "desc" } });
}

async function logEvent(
  cycleId: string | null,
  type: string,
  detail?: unknown
) {
  await prisma.eventLog.create({
    data: {
      cycleId,
      type,
      detail: detail !== undefined ? JSON.stringify(detail) : null,
    },
  });
}

/** Sends the initial "please check in" prompt over every configured channel. */
async function sendCheckInPrompt(
  cycleId: string,
  token: string,
  schedule: ScheduleConfig
) {
  const admin = await prisma.adminUser.findFirst();
  const channels = getCheckInChannels(schedule);
  const confirmUrl = `${getBaseUrl()}/checkin/confirm?token=${token}`;
  const graceDescription = describeDuration(
    schedule.graceValue,
    schedule.graceUnit as DurationUnit
  );
  const subject = "Check in: are you OK? — Steadfast";
  const message = `This is your scheduled check-in.\n\nIf you're OK, confirm here:\n${confirmUrl}\n\nIf we don't hear from you within ${graceDescription}, Steadfast will begin escalating — trying to reach you more aggressively, then notifying your emergency contacts.`;

  for (const channel of channels) {
    try {
      if (channel === "email" && admin?.email) {
        const result = await sendEmail({ to: admin.email, subject, text: message });
        await logEvent(cycleId, "checkin_sent", { channel, result });
      } else if (channel === "sms" && admin?.encryptedPhone) {
        const to = decryptField(admin.encryptedPhone);
        const result = await sendSms({ to, body: `${subject}\n\n${message}` });
        await logEvent(cycleId, "checkin_sent", { channel, result });
      } else if (channel === "push") {
        const result = await sendPushToAll({ title: subject, body: message, url: "/dashboard" });
        await logEvent(cycleId, "checkin_sent", { channel, result });
      } else {
        await logEvent(cycleId, "checkin_sent_skipped", {
          channel,
          reason: "No contact info configured for this channel.",
        });
      }
    } catch (error) {
      await logEvent(cycleId, "checkin_send_failed", {
        channel,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export async function startNewCycle(schedule: ScheduleConfig) {
  const now = new Date();
  const dueAt = addDuration(
    now,
    schedule.graceValue,
    schedule.graceUnit as DurationUnit
  );

  const cycle = await prisma.checkInCycle.create({
    data: { status: "waiting", startedAt: now, dueAt },
  });

  const token = generateToken();
  await prisma.checkInToken.create({
    data: { cycleId: cycle.id, token },
  });

  await logEvent(cycle.id, "cycle_started", {
    dueAt,
    nextCheckInAfter: addDuration(
      now,
      schedule.intervalValue,
      schedule.intervalUnit as DurationUnit
    ),
  });

  await sendCheckInPrompt(cycle.id, token, schedule);

  return cycle;
}

/** Resolves a cycle (user confirmed) and immediately starts the next one. */
async function resolveAndRestart(cycleId: string) {
  const now = new Date();
  await prisma.checkInCycle.update({
    where: { id: cycleId },
    data: { status: "resolved", resolvedAt: now, nextStepAt: null },
  });
  await logEvent(cycleId, "checkin_confirmed");

  const schedule = await getScheduleConfig();
  if (!schedule.isPaused) {
    await startNewCycle(schedule);
  }
}

export type ConfirmResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "already_used" };

export async function confirmByToken(token: string): Promise<ConfirmResult> {
  const record = await prisma.checkInToken.findUnique({ where: { token } });
  if (!record) return { ok: false, reason: "invalid" };
  if (record.usedAt) return { ok: false, reason: "already_used" };

  await prisma.checkInToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await resolveAndRestart(record.cycleId);
  return { ok: true };
}

/** Used by the dashboard's "I'm OK" button — no token needed, already authenticated. */
export async function confirmByAdmin(): Promise<ConfirmResult> {
  const cycle =
    (await getActiveCycle()) ??
    (await prisma.checkInCycle.findFirst({
      where: { status: "concluded" },
      orderBy: { createdAt: "desc" },
    }));
  if (!cycle) return { ok: false, reason: "invalid" };
  await resolveAndRestart(cycle.id);
  return { ok: true };
}

export async function pauseSwitch() {
  await prisma.scheduleConfig.update({
    where: { id: "singleton" },
    data: { isPaused: true },
  });
  const active = await getActiveCycle();
  if (active) {
    await prisma.checkInCycle.update({
      where: { id: active.id },
      data: { status: "resolved", resolvedAt: new Date(), nextStepAt: null },
    });
    await logEvent(active.id, "paused");
  } else {
    await logEvent(null, "paused");
  }
}

export async function resumeSwitch() {
  await prisma.scheduleConfig.update({
    where: { id: "singleton" },
    data: { isPaused: false },
  });
  await logEvent(null, "resumed");
  const schedule = await getScheduleConfig();
  await startNewCycle(schedule);
}
