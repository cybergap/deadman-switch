import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, errorResponse } from "@/lib/api";
import {
  getActiveCycle,
  getCheckInChannels,
  getLatestCycle,
  getScheduleConfig,
} from "@/lib/checkin";

export async function GET() {
  try {
    await requireAdminRead();

    const schedule = await getScheduleConfig();
    const activeCycle = await getActiveCycle();
    const latestCycle = await getLatestCycle();
    const [stepCount, contactCount] = await Promise.all([
      prisma.escalationStep.count(),
      prisma.contact.count(),
    ]);

    const relevantCycle =
      activeCycle ??
      (latestCycle?.status === "concluded" ? latestCycle : null);

    return NextResponse.json({
      schedule: {
        intervalValue: schedule.intervalValue,
        intervalUnit: schedule.intervalUnit,
        graceValue: schedule.graceValue,
        graceUnit: schedule.graceUnit,
        checkInChannels: getCheckInChannels(schedule),
        timezone: schedule.timezone,
        isPaused: schedule.isPaused,
      },
      cycle: relevantCycle
        ? {
            status: relevantCycle.status,
            startedAt: relevantCycle.startedAt,
            dueAt: relevantCycle.dueAt,
            nextStepAt: relevantCycle.nextStepAt,
            currentStepIndex: relevantCycle.currentStepIndex,
          }
        : null,
      stepCount,
      contactCount,
      hasEverStarted: latestCycle !== null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
