import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw) {
    throw new Error(
      "SESSION_SECRET environment variable is not set. Generate one with `openssl rand -base64 32`."
    );
  }
  return new TextEncoder().encode(raw);
}

export class AuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
  }
}

export async function hasAdminUser(): Promise<boolean> {
  const count = await prisma.adminUser.count();
  return count > 0;
}

export async function createAdminUser(email: string, password: string) {
  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    throw new Error("An admin account already exists.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.adminUser.create({ data: { email, passwordHash } });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    // Still run a hash comparison against a dummy value so login timing
    // doesn't reveal whether the email exists.
    await bcrypt.compare(password, "$2a$12$" + "a".repeat(53));
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** For use in Server Components / pages. Throws AuthError if not logged in. */
export async function requireSession(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new AuthError();
  }
  return userId;
}
