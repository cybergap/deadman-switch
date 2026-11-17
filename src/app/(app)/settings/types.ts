import type { DurationUnit } from "@/lib/time";

export type ScheduleData = {
  intervalValue: number;
  intervalUnit: DurationUnit;
  graceValue: number;
  graceUnit: DurationUnit;
  checkInChannels: string[];
  timezone: string;
};

export type ProfileData = {
  email: string;
  phone: string;
};

export type ContactData = {
  id: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
};

export type WebhookConfig = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
};

export type ActionData = {
  id: string;
  label: string;
  type: "email" | "sms" | "call" | "webhook" | "push";
  contactId: string | null;
  contactName: string | null;
  messageTemplate: string | null;
  webhookConfig: WebhookConfig | null;
};

export type StepData = {
  id: string;
  order: number;
  label: string;
  delayValue: number;
  delayUnit: DurationUnit;
  isFinal: boolean;
  actions: { id: string; label: string; type: string }[];
};
