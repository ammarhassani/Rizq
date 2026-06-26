import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { encryptTokenWith, decryptTokenWith } from "./tokenCrypto";

const key = crypto.randomBytes(32);

describe("token crypto (AES-256-GCM envelope)", () => {
  it("round-trips a token", () => {
    const secret = "gho_exampleAccessToken_1234567890";
    const enc = encryptTokenWith(key, secret);
    expect(enc).not.toContain(secret); // ciphertext does not leak the token
    expect(decryptTokenWith(key, enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptTokenWith(key, "same");
    const b = encryptTokenWith(key, "same");
    expect(a).not.toBe(b);
    expect(decryptTokenWith(key, a)).toBe("same");
    expect(decryptTokenWith(key, b)).toBe("same");
  });

  it("fails to decrypt with the wrong key (GCM auth)", () => {
    const enc = encryptTokenWith(key, "secret");
    expect(() => decryptTokenWith(crypto.randomBytes(32), enc)).toThrow();
  });

  it("fails to decrypt tampered ciphertext", () => {
    const enc = encryptTokenWith(key, "secret");
    const raw = Buffer.from(enc, "base64");
    raw[raw.length - 1] ^= 0xff; // flip a byte
    expect(() => decryptTokenWith(key, raw.toString("base64"))).toThrow();
  });
});
