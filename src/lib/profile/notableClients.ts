/**
 * Normalize a notable-clients list: trim each entry, drop empties, dedupe
 * (keeping first occurrence), and cap the count.
 *
 * Commas WITHIN an entry are preserved — entries are never split. That is the
 * whole point of moving off the old comma-joined text field (a client name like
 * "Acme, Inc." used to break into two). See feature 001 / bug ⑦.
 */
export function normalizeNotableClients(items: readonly string[], max = 20): string[] {
  const out: string[] = [];
  for (const raw of items) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    if (out.includes(v)) continue;
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}
