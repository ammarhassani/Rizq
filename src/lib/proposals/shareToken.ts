/**
 * Share tokens are base64url strings (8–64 chars). Validate before any value
 * reaches the database RPC — defense-in-depth against malformed / injection-shaped
 * input on the public share surface (feature 001 / bug ④).
 */
export function isValidShareToken(token: string | null | undefined): token is string {
  if (!token || token.length < 8 || token.length > 64) return false;
  return /^[A-Za-z0-9_-]+$/.test(token);
}
