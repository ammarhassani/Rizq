"use client";

/**
 * MonthlyGoalWheel (feature 007) — the monthly income goal as a compact,
 * open wheel scroller (iOS-style): snap scrolling, a center selection window,
 * items fade + scale with distance from center, gradient-masked top/bottom.
 * Doubling-scale ranges 5k→1M; stores the selected segment's upper bound.
 * Never auto-commits on mount — only a real scroll/tap sets the goal.
 */

import { useEffect, useRef, useState } from "react";

const SEGMENTS: { lo: number; hi: number }[] = [
  { lo: 5_000, hi: 10_000 },
  { lo: 10_000, hi: 25_000 },
  { lo: 25_000, hi: 50_000 },
  { lo: 50_000, hi: 100_000 },
  { lo: 100_000, hi: 250_000 },
  { lo: 250_000, hi: 500_000 },
  { lo: 500_000, hi: 1_000_000 },
];

const ITEM_H = 44;
const PAD = ITEM_H; // one item of padding → first/last can center

function short(n: number): string {
  return n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}k`;
}

export function MonthlyGoalWheel({
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
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interacted = useRef(false);

  const selectedIdx = SEGMENTS.findIndex((s) => String(s.hi) === value);
  const [active, setActive] = useState(selectedIdx >= 0 ? selectedIdx : 0);

  // Position the wheel to the current value (mount + external changes) without
  // committing. onScroll below fires but `interacted` gates the commit.
  useEffect(() => {
    const idx = SEGMENTS.findIndex((s) => String(s.hi) === value);
    const target = idx >= 0 ? idx : active;
    if (ref.current) ref.current.scrollTop = target * ITEM_H;
    setActive(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleScroll = () => {
    if (!ref.current) return;
    const idx = Math.max(0, Math.min(SEGMENTS.length - 1, Math.round(ref.current.scrollTop / ITEM_H)));
    setActive(idx);
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (!interacted.current) return; // don't commit programmatic positioning
      const hi = String(SEGMENTS[idx].hi);
      if (hi !== value) onChange(hi);
    }, 130);
  };

  const scrollTo = (i: number) => {
    interacted.current = true;
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
  };

  const sel = active >= 0 ? SEGMENTS[active] : null;

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={`text-sm font-medium text-rizq-ink ${font}`}>
          {isAr ? "هدف الدخل الشهري" : "Monthly income goal"}
        </span>
        {value && sel && (
          <span className={`tabular text-sm font-bold text-rizq-green ${font}`}>
            {short(sel.lo)}–{short(sel.hi)} {currency}
          </span>
        )}
      </div>

      <div className="relative rounded-xl border border-[#8f7e48] bg-rizq-cream/60">
        {/* Center selection window */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-lg border border-rizq-green/40 bg-rizq-green/[0.06]"
          style={{ height: ITEM_H }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          onWheel={() => (interacted.current = true)}
          onTouchStart={() => (interacted.current = true)}
          onPointerDown={() => (interacted.current = true)}
          role="listbox"
          aria-label={isAr ? "هدف الدخل الشهري" : "Monthly income goal"}
          className="relative h-[132px] snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingTop: PAD,
            paddingBottom: PAD,
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)",
          }}
        >
          {SEGMENTS.map((s, i) => {
            const d = Math.abs(i - active);
            const isSel = i === active;
            return (
              <button
                key={s.hi}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => scrollTo(i)}
                className={`flex w-full snap-center items-center justify-center tabular transition-[opacity,transform] duration-150 ${
                  isSel ? "text-rizq-green font-bold" : "text-rizq-ink"
                } ${font}`}
                style={{
                  height: ITEM_H,
                  opacity: Math.max(0.25, 1 - d * 0.32),
                  transform: `scale(${Math.max(0.82, 1 - d * 0.11)})`,
                }}
              >
                {short(s.lo)}–{short(s.hi)}
                <span className={`ms-1.5 text-xs ${isSel ? "text-rizq-green/70" : "text-rizq-ink-soft/50"}`}>
                  {currency}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
