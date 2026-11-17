export type DurationUnit = "minutes" | "hours" | "days";

const MS_PER_UNIT: Record<DurationUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

export function durationMs(value: number, unit: DurationUnit): number {
  return value * MS_PER_UNIT[unit];
}

export function addDuration(date: Date, value: number, unit: DurationUnit): Date {
  return new Date(date.getTime() + durationMs(value, unit));
}

export function describeDuration(value: number, unit: DurationUnit): string {
  const plural = value === 1 ? unit.slice(0, -1) : unit;
  return `${value} ${plural}`;
}
