/**
 * Project Workspace (spec 004) — Phase 5 token crypto (server-only).
 *
 * App-layer envelope encryption (AES-256-GCM) for provider OAuth tokens. The
 * key lives ONLY in server env (`PROVIDER_TOKEN_KEY`, 32 bytes as base64 or
 * hex) — never `NEXT_PUBLIC_*`. Output is base64 `iv(12) | tag(16) | ciphertext`.
 * A leaked ciphertext is useless without the key. Pure/deterministic given a
 * key → unit-testable.
 */

import crypto from "node:crypto";

const ALG = "aes-256-gcm";

function loadKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

export function isTokenCryptoConfigured(): boolean {
  return loadKey(process.env.PROVIDER_TOKEN_KEY) !== null;
}

/** Encrypt with an explicit key (testable) or the env key. Returns base64. */
export function encryptTokenWith(key: Buffer, plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptTokenWith(key: Buffer, payloadB64: string): string {
  const raw = Buffer.from(payloadB64, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function envKeyOrThrow(): Buffer {
  const key = loadKey(process.env.PROVIDER_TOKEN_KEY);
  if (!key) throw new Error("PROVIDER_TOKEN_KEY is not configured (need 32 bytes, base64 or hex)");
  return key;
}

export function encryptToken(plaintext: string): string {
  return encryptTokenWith(envKeyOrThrow(), plaintext);
}

export function decryptToken(payloadB64: string): string {
  return decryptTokenWith(envKeyOrThrow(), payloadB64);
}
