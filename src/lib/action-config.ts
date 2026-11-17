import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptJSON, encryptJSON } from "@/lib/crypto";
import { ACTION_TYPES, type ActionType } from "@/lib/constants";
import type { ActionConfig, Contact } from "@/generated/prisma";

const webhookConfigSchema = z.object({
  url: z.string().url().max(2000),
  method: z.enum(["GET", "POST", "PUT", "PATCH"]).optional(),
  headers: z.record(z.string().max(100), z.string().max(1000)).optional(),
  bodyTemplate: z.string().max(5000).optional(),
});

export const actionInputSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(ACTION_TYPES),
  contactId: z.string().min(1).max(100).optional().nullable(),
  messageTemplate: z.string().trim().max(2000).optional().nullable(),
  webhookConfig: webhookConfigSchema.optional(),
});

export type ActionInput = z.infer<typeof actionInputSchema>;

export class ActionValidationError extends Error {}

/** Validates type-specific requirements and returns data ready for Prisma. */
export async function prepareActionData(input: ActionInput) {
  if (input.type === "email" || input.type === "sms" || input.type === "call") {
    if (!input.contactId) {
      throw new ActionValidationError(`A ${input.type} action needs a contact.`);
    }
    const contact = await prisma.contact.findUnique({ where: { id: input.contactId } });
    if (!contact) {
      throw new ActionValidationError("That contact doesn't exist.");
    }
    if (input.type === "email" && !contact.encryptedEmail) {
      throw new ActionValidationError(`${contact.name} doesn't have an email address.`);
    }
    if ((input.type === "sms" || input.type === "call") && !contact.encryptedPhone) {
      throw new ActionValidationError(`${contact.name} doesn't have a phone number.`);
    }
    return {
      label: input.label,
      type: input.type,
      contactId: input.contactId,
      messageTemplate: input.messageTemplate || null,
      encryptedConfig: null,
    };
  }

  if (input.type === "webhook") {
    if (!input.webhookConfig) {
      throw new ActionValidationError("A webhook action needs a URL.");
    }
    return {
      label: input.label,
      type: input.type,
      contactId: null,
      messageTemplate: input.messageTemplate || null,
      encryptedConfig: encryptJSON(input.webhookConfig),
    };
  }

  // push
  return {
    label: input.label,
    type: input.type,
    contactId: null,
    messageTemplate: input.messageTemplate || null,
    encryptedConfig: null,
  };
}

export function serializeAction(
  action: ActionConfig & { contact: Contact | null }
) {
  return {
    id: action.id,
    label: action.label,
    type: action.type as ActionType,
    contactId: action.contactId,
    contactName: action.contact?.name ?? null,
    messageTemplate: action.messageTemplate,
    webhookConfig:
      action.type === "webhook" && action.encryptedConfig
        ? decryptJSON<{ url: string; method?: string; headers?: Record<string, string>; bodyTemplate?: string }>(
            action.encryptedConfig
          )
        : null,
    createdAt: action.createdAt,
  };
}
