"use client";

/**
 * MonthlyGoalSegments (feature 007) — the monthly income goal as an animated
 * "income ladder": doubling-scale segments (5k→1M) shown as growing bars, so the
 * magnitude is felt, not just read. Staggered entrance, animated selection fill +
 * glow, and a live hero readout. Stores the segment's upper bound (the target).
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

// Doubling-flavoured ladder to 1M (each step ~2–2.5×).
const SEGMENTS: { lo: number; hi: number }[] = [
  { lo: 5_000, hi: 10_000 },
  { lo: 10_000, hi: 25_000 },
  { lo: 25_000, hi: 50_000 },
  { lo: 50_000, hi: 100_000 },
  { lo: 100_000, hi: 250_000 },
  { lo: 250_000, hi: 500_000 },
  { lo: 500_000, hi: 1_000_000 },
];

function short(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  return `${Math.round(n / 1000)}k`;
}

export function MonthlyGoalSegments({
  value,
  onChange,
  locale,
  currency,
}: {
  value: string;
  onChange: (v: string) => void;
  locale: "ar" | "en";
  currency: string;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const reduce = useReducedMotion();

  const selected = SEGMENTS.find((s) => String(s.hi) === value) ?? null;

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      {/* Hero readout */}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className={`text-sm font-medium text-rizq-ink ${font}`}>
          {isAr ? "هدف الدخل الشهري" : "Monthly income goal"}
        </span>
        <motion.span
          key={selected ? selected.hi : "none"}
          initial={reduce ? undefined : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`tabular text-sm font-bold ${selected ? "text-rizq-green" : "text-rizq-ink-soft/60"} ${font}`}
        >
          {selected ? `${short(selected.lo)}–${short(selected.hi)} ${currency}` : isAr ? "اختر مداك" : "Pick your range"}
        </motion.span>
      </div>

      <div className="space-y-1.5">
        {SEGMENTS.map((s, i) => {
          const isSel = selected?.hi === s.hi;
          // Bars grow with the ladder — a felt sense of the doubling scale.
          const widthPct = 42 + (i * 58) / (SEGMENTS.length - 1);
          return (
            <motion.button
              key={s.hi}
              type="button"
              role="option"
              aria-selected={isSel}
              onClick={() => onChange(isSel ? "" : String(s.hi))}
              initial={reduce ? undefined : { opacity: 0, x: isAr ? 14 : -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.045, duration: 0.3, ease: "easeOut" }}
              whileHover={reduce ? undefined : { scale: 1.01 }}
              whileTap={reduce ? undefined : { scale: 0.99 }}
              className="relative block h-11 w-full overflow-hidden rounded-xl border border-[#8f7e48]/60 bg-rizq-cream/40"
            >
              {/* Growing fill bar */}
              <motion.div
                className={`absolute inset-y-0 ${isAr ? "right-0" : "left-0"} rounded-xl ${
                  isSel
                    ? "bg-gradient-to-r from-rizq-green to-rizq-gold shadow-[0_0_18px_-4px_rgba(26,95,63,0.5)]"
                    : "bg-rizq-green/10"
                }`}
                initial={false}
                animate={{ width: `${widthPct}%` }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
              />
              {/* Label overlay */}
              <span
                className={`absolute inset-0 flex items-center justify-between px-4 text-sm ${
                  isSel ? "text-white font-semibold" : "text-rizq-ink"
                } ${font}`}
              >
                <span className="tabular drop-shadow-sm">
                  {short(s.lo)}–{short(s.hi)}
                </span>
                <span className={`text-xs ${isSel ? "text-white/90" : "text-rizq-ink-soft/60"}`}>
                  {isSel ? <Check size={15} strokeWidth={3} /> : currency}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
