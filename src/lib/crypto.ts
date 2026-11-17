import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.MASTER_KEY;
  if (!raw) {
    throw new Error(
      "MASTER_KEY environment variable is not set. Generate one with `openssl rand -base64 32`."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "MASTER_KEY must decode to exactly 32 bytes. Generate one with `openssl rand -base64 32`."
    );
  }
  return key;
}

/** Encrypts a UTF-8 string, returning `iv.tag.ciphertext` (each base64). */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptField(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, ciphertextB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted payload.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function encryptJSON(value: unknown): string {
  return encryptField(JSON.stringify(value));
}

export function decryptJSON<T>(payload: string): T {
  return JSON.parse(decryptField(payload)) as T;
}

/** Cryptographically random URL-safe token, e.g. for check-in confirmation links. */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
