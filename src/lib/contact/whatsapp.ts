/**
 * Normalize a phone number into a wa.me-compatible international form (digits only, no `+`,
 * no leading trunk 0). Saudi numbers are assumed when no country code is present.
 *
 * wa.me requires the full international number without `+` or leading 0 (e.g. 966512345678).
 * The old code did `raw.replace(/\D/g, "")`, which left a local `0512…` intact → an invalid
 * `wa.me/0512…` link that WhatsApp rejects.
 */
export function toWaNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2); // 00966… international prefix → drop
  if (d.startsWith("966")) return d; // already international
  if (d.startsWith("0")) d = d.slice(1); // local trunk 0 → drop
  // Saudi mobile is 9 digits starting with 5.
  if (d.length === 9 && d.startsWith("5")) return "966" + d;
  // Already-international-looking numbers (>= 11 digits) pass through; otherwise assume KSA.
  return d.length >= 11 ? d : "966" + d;
}

/** Full https://wa.me/<number> link, or null when there's no usable number. */
export function waLink(raw: string | null | undefined): string | null {
  const n = toWaNumber(raw);
  return n ? `https://wa.me/${n}` : null;
}
