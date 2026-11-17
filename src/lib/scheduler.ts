import { prisma } from "@/lib/prisma";
import {
  getActiveCycle,
  getLatestCycle,
  getScheduleConfig,
  startNewCycle,
} from "@/lib/checkin";
import { addDuration, type DurationUnit } from "@/lib/time";
import { executeAction } from "@/lib/providers/dispatch";
import type { CheckInCycle } from "@/generated/prisma";

async function logEvent(cycleId: string | null, type: string, detail?: unknown) {
  await prisma.eventLog.create({
    data: {
      cycleId,
      type,
      detail: detail !== undefined ? JSON.stringify(detail) : null,
    },
  });
}

async function getOrderedSteps() {
  return prisma.escalationStep.findMany({
    orderBy: { order: "asc" },
    include: {
      actions: {
        include: { action: { include: { contact: true } } },
      },
    },
  });
}

async function beginEscalation(cycle: CheckInCycle) {
  const steps = await getOrderedSteps();
  if (steps.length === 0) {
    await prisma.checkInCycle.update({
      where: { id: cycle.id },
      data: { status: "escalating" },
    });
    await logEvent(cycle.id, "escalation_started_no_steps", {
      note: "No escalation steps are configured. Add some in Settings.",
    });
    return;
  }

  const firstStep = steps[0];
  const nextStepAt = addDuration(
    cycle.dueAt,
    firstStep.delayValue,
    firstStep.delayUnit as DurationUnit
  );

  await prisma.checkInCycle.update({
    where: { id: cycle.id },
    data: { status: "escalating", nextStepAt },
  });
  await logEvent(cycle.id, "escalation_started", { firstStepAt: nextStepAt });
}

async function fireStep(cycle: CheckInCycle) {
  const steps = await getOrderedSteps();
  const nextIndex = cycle.currentStepIndex + 1;
  const step = steps[nextIndex];
  if (!step) return;

  const subject = `Steadfast alert: ${step.label}`;
  const message = `No check-in was received after the scheduled deadline (${cycle.dueAt.toISOString()}). This is an automated alert from a Steadfast deadman switch. If this is a false alarm, the owner should check in immediately from their dashboard.`;

  const results: unknown[] = [];
  for (const link of step.actions) {
    const result = await executeAction(link.action, { subject, message });
    results.push({ actionId: link.action.id, type: link.action.type, result });
  }
  await logEvent(cycle.id, "step_fired", { stepId: step.id, label: step.label, results });

  const nextStep = steps[nextIndex + 1];
  if (step.isFinal || !nextStep) {
    await prisma.checkInCycle.update({
      where: { id: cycle.id },
      data: { status: "concluded", currentStepIndex: nextIndex, nextStepAt: null },
    });
    await logEvent(cycle.id, "cycle_concluded", {
      reason: step.isFinal ? "final_step" : "ladder_exhausted",
    });
    return;
  }

  const nextStepAt = addDuration(
    new Date(),
    nextStep.delayValue,
    nextStep.delayUnit as DurationUnit
  );
  await prisma.checkInCycle.update({
    where: { id: cycle.id },
    data: { currentStepIndex: nextIndex, nextStepAt },
  });
}

/** One tick of the scheduler. Call this on a short, reliable interval. */
export async function runTick(): Promise<void> {
  const schedule = await getScheduleConfig();
  if (schedule.isPaused) return;

  const active = await getActiveCycle();
  const now = new Date();

  if (!active) {
    const latest = await getLatestCycle();
    if (!latest || latest.status === "resolved") {
      await startNewCycle(schedule);
    }
    // status === "concluded": wait for a manual reset from the dashboard.
    return;
  }

  if (active.status === "waiting" && now >= active.dueAt) {
    await beginEscalation(active);
    return;
  }

  if (active.status === "escalating" && active.nextStepAt && now >= active.nextStepAt) {
    await fireStep(active);
  }
}
