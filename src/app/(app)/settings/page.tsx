import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto";
import { getCheckInChannels, getScheduleConfig } from "@/lib/checkin";
import { getOrderedStepsWithActions, serializeStep } from "@/lib/escalation-steps";
import { serializeAction } from "@/lib/action-config";
import { requireSession } from "@/lib/auth";
import type { DurationUnit } from "@/lib/time";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const userId = await requireSession();

  const [schedule, admin, contacts, actions, steps] = await Promise.all([
    getScheduleConfig(),
    prisma.adminUser.findUnique({ where: { id: userId } }),
    prisma.contact.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.actionConfig.findMany({ orderBy: { createdAt: "asc" }, include: { contact: true } }),
    getOrderedStepsWithActions(),
  ]);

  return (
    <SettingsClient
      initialSchedule={{
        intervalValue: schedule.intervalValue,
        intervalUnit: schedule.intervalUnit as DurationUnit,
        graceValue: schedule.graceValue,
        graceUnit: schedule.graceUnit as DurationUnit,
        checkInChannels: getCheckInChannels(schedule),
        timezone: schedule.timezone,
      }}
      initialProfile={{
        email: admin?.email ?? "",
        phone: admin?.encryptedPhone ? decryptField(admin.encryptedPhone) : "",
      }}
      initialContacts={contacts.map((c) => ({
        id: c.id,
        name: c.name,
        relationship: c.relationship,
        email: c.encryptedEmail ? decryptField(c.encryptedEmail) : null,
        phone: c.encryptedPhone ? decryptField(c.encryptedPhone) : null,
      }))}
      initialActions={actions.map(serializeAction)}
      initialSteps={steps.map(serializeStep)}
    />
  );
}
