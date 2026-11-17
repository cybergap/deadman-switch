export const DURATION_UNITS = ["minutes", "hours", "days"] as const;
export type DurationUnitValue = (typeof DURATION_UNITS)[number];

export const CHECKIN_CHANNELS = ["email", "sms", "push"] as const;
export type CheckInChannel = (typeof CHECKIN_CHANNELS)[number];

export const ACTION_TYPES = ["email", "sms", "call", "webhook", "push"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
