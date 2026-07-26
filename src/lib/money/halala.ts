/**
 * SAR money entry — two decimals, because the halala is the smallest unit there is.
 *
 * A unit price of 10450.555 printed as 10,450.56 while the line total was computed on the
 * unrounded value: the client's own arithmetic on the printed price disagreed with the
 * printed total by a halala. Constraining at ENTRY keeps one true value everywhere, rather
 * than papering over a display-vs-storage divergence.
 *
 * PURE.
 */

/** Round a monetary amount to halalas. */
export function roundHalala(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Constrain a money input's text to at most two decimals as it is typed.
 *
 * Truncates rather than rounds: rounding mid-typing turns "10.55" into "10.56" the moment a
 * third digit is pressed, which fights the person entering it — and never rounds a price up
 * without them asking. Partial input ("10.", "") is left alone so typing still works.
 */
export function clampMoneyInput(raw: string): string {
  if (raw === "") return "";

  const dot = raw.indexOf(".");
  if (dot === -1) return raw;

  const whole = raw.slice(0, dot);
  const frac = raw.slice(dot + 1);
  return frac.length > 2 ? `${whole}.${frac.slice(0, 2)}` : raw;
}
