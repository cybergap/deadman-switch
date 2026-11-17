export type SendResult =
  | { ok: true; providerId?: string; dryRun?: boolean }
  | { ok: false; error: string };
