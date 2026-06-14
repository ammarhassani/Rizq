import { createHash } from "node:crypto";

/** Short, stable hash of a prompt template for reproducibility/audit. */
export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
