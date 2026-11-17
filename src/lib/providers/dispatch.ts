import { decryptField, decryptJSON } from "@/lib/crypto";
import { sendEmail } from "./email";
import { sendSms, makeVoiceCall } from "./sms";
import { callWebhook } from "./webhook";
import { sendPushToAll } from "./push";
import type { SendResult } from "./types";
import type { ActionConfig, Contact } from "@/generated/prisma";

export type ActionWithContact = ActionConfig & { contact: Contact | null };

export type DispatchContext = {
  subject: string;
  message: string;
};

type WebhookConfig = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
};

function renderTemplate(template: string, context: DispatchContext): string {
  return template
    .replaceAll("{{subject}}", context.subject)
    .replaceAll("{{message}}", context.message);
}

export async function executeAction(
  action: ActionWithContact,
  context: DispatchContext
): Promise<SendResult> {
  switch (action.type) {
    case "email": {
      if (!action.contact?.encryptedEmail) {
        return { ok: false, error: "This action's contact has no email address." };
      }
      const to = decryptField(action.contact.encryptedEmail);
      const subject = action.messageTemplate
        ? renderTemplate(action.messageTemplate, context)
        : context.subject;
      return sendEmail({ to, subject, text: context.message });
    }
    case "sms": {
      if (!action.contact?.encryptedPhone) {
        return { ok: false, error: "This action's contact has no phone number." };
      }
      const to = decryptField(action.contact.encryptedPhone);
      const body = action.messageTemplate
        ? renderTemplate(action.messageTemplate, context)
        : context.message;
      return sendSms({ to, body });
    }
    case "call": {
      if (!action.contact?.encryptedPhone) {
        return { ok: false, error: "This action's contact has no phone number." };
      }
      const to = decryptField(action.contact.encryptedPhone);
      const message = action.messageTemplate
        ? renderTemplate(action.messageTemplate, context)
        : context.message;
      return makeVoiceCall({ to, message });
    }
    case "webhook": {
      if (!action.encryptedConfig) {
        return { ok: false, error: "This webhook action has no configuration." };
      }
      const config = decryptJSON<WebhookConfig>(action.encryptedConfig);
      const body = config.bodyTemplate
        ? renderTemplate(config.bodyTemplate, context)
        : JSON.stringify({ subject: context.subject, message: context.message });
      return callWebhook({
        url: config.url,
        method: config.method,
        headers: config.headers,
        body: safeJsonParse(body) ?? body,
      });
    }
    case "push": {
      return sendPushToAll({ title: context.subject, body: context.message });
    }
    default:
      return { ok: false, error: `Unknown action type: ${action.type}` };
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
