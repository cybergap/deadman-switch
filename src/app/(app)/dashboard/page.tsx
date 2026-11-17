import { prisma } from "@/lib/prisma";
import {
  getActiveCycle,
  getCheckInChannels,
  getLatestCycle,
  getScheduleConfig,
} from "@/lib/checkin";
import type { DurationUnit } from "@/lib/time";
import { DashboardClient, type CycleStatus, type StatusPayload } from "./dashboard-client";

export default async function DashboardPage() {
  const schedule = await getScheduleConfig();
  const activeCycle = await getActiveCycle();
  const latestCycle = await getLatestCycle();
  const [stepCount, contactCount] = await Promise.all([
    prisma.escalationStep.count(),
    prisma.contact.count(),
  ]);

  const relevantCycle =
    activeCycle ?? (latestCycle?.status === "concluded" ? latestCycle : null);

  const initialStatus: StatusPayload = {
    schedule: {
      intervalValue: schedule.intervalValue,
      intervalUnit: schedule.intervalUnit as DurationUnit,
      graceValue: schedule.graceValue,
      graceUnit: schedule.graceUnit as DurationUnit,
      checkInChannels: getCheckInChannels(schedule),
      timezone: schedule.timezone,
      isPaused: schedule.isPaused,
    },
    cycle: relevantCycle
      ? {
          status: relevantCycle.status as CycleStatus,
          startedAt: relevantCycle.startedAt.toISOString(),
          dueAt: relevantCycle.dueAt.toISOString(),
          nextStepAt: relevantCycle.nextStepAt?.toISOString() ?? null,
          currentStepIndex: relevantCycle.currentStepIndex,
        }
      : null,
    stepCount,
    contactCount,
    hasEverStarted: latestCycle !== null,
  };

  return <DashboardClient initialStatus={initialStatus} />;
}
