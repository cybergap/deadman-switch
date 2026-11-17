import { prisma } from "@/lib/prisma";
import type { DurationUnit } from "@/lib/time";
import type { ActionConfig, EscalationStep, EscalationStepAction } from "@/generated/prisma";

type StepWithActions = EscalationStep & {
  actions: (EscalationStepAction & { action: ActionConfig })[];
};

export function serializeStep(step: StepWithActions) {
  return {
    id: step.id,
    order: step.order,
    label: step.label,
    delayValue: step.delayValue,
    delayUnit: step.delayUnit as DurationUnit,
    isFinal: step.isFinal,
    actions: step.actions.map((link) => ({
      id: link.action.id,
      label: link.action.label,
      type: link.action.type,
    })),
  };
}

export async function getOrderedStepsWithActions() {
  return prisma.escalationStep.findMany({
    orderBy: { order: "asc" },
    include: { actions: { include: { action: true } } },
  });
}

/**
 * Renumbers steps to a contiguous 1..n sequence in the given id order.
 * `order` is unique, so this goes through a negative "holding" range first
 * to avoid unique-constraint collisions between the old and new numbering.
 */
export async function resequenceSteps(orderedIds?: string[]) {
  const steps = orderedIds
    ? await prisma.escalationStep.findMany({ where: { id: { in: orderedIds } } })
    : await prisma.escalationStep.findMany({ orderBy: { order: "asc" } });

  const byId = new Map(steps.map((s) => [s.id, s]));
  const sequence = orderedIds
    ? orderedIds.map((id) => byId.get(id)).filter((s): s is EscalationStep => !!s)
    : steps;

  await prisma.$transaction([
    ...sequence.map((step, index) =>
      prisma.escalationStep.update({
        where: { id: step.id },
        data: { order: -(index + 1) },
      })
    ),
    ...sequence.map((step, index) =>
      prisma.escalationStep.update({
        where: { id: step.id },
        data: { order: index + 1 },
      })
    ),
  ]);
}
