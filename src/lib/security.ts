import "server-only";

export class ForbiddenError extends Error {}

/**
 * Lightweight CSRF defense for cookie-authenticated mutations: the session
 * cookie is SameSite=Lax, but this adds a belt-and-suspenders check that
 * the request actually originated from this app's own origin.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin browser requests to a same-site API route normally include
    // Origin for state-changing methods. Missing entirely is suspicious enough
    // to reject rather than guess.
    throw new ForbiddenError("Missing Origin header.");
  }
  const host = request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ForbiddenError("Invalid Origin header.");
  }
  if (!host || originHost !== host) {
    throw new ForbiddenError("Cross-origin request blocked.");
  }
}

type RateLimitEntry = { count: number; resetAt: number };
const buckets = new Map<string, RateLimitEntry>();

/**
 * Simple fixed-window in-memory rate limiter. Good enough for a
 * single-instance personal deployment; state resets on process restart.
 */
export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
