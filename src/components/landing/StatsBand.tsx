"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

type Props = { locale: "ar" | "en" };

type Stat = {
  valueKey: string;
  suffixKey?: string;
  labelKey: string;
};

const STATS: Stat[] = [
  { valueKey: "stats.s1Value", labelKey: "stats.s1Label" },
  { valueKey: "stats.s2Value", suffixKey: "stats.s2Suffix", labelKey: "stats.s2Label" },
  { valueKey: "stats.s3Value", labelKey: "stats.s3Label" },
  { valueKey: "stats.s4Value", suffixKey: "stats.s4Suffix", labelKey: "stats.s4Label" },
];

/**
 * Compact strip of real product numbers (13 tools · 25+ AI features ·
 * 3 data sources · 2 languages). Each number counts up once when the band
 * scrolls into view. Client-only so it can observe intersection; honors
 * reduced motion (renders final values immediately, no count-up).
 *
 * Sits on the dark ink surface as a punchy break between the value props
 * and the apps grid.
 */
export function StatsBand({ locale }: Props) {
  const t = useTranslations("Landing");
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section
      aria-label={t("stats.ariaLabel")}
      className="relative border-t border-rizq-gold/20 bg-rizq-ink overflow-hidden"
    >
      {/* faint gold dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.25] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200,169,81,0.5) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {STATS.map((stat, i) => (
            <StatItem
              key={stat.valueKey}
              value={Number(t(stat.valueKey))}
              suffix={stat.suffixKey ? t(stat.suffixKey) : ""}
              label={t(stat.labelKey)}
              locale={locale}
              font={font}
              reduce={!!reduce}
              isLast={i === STATS.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({
  value,
  suffix,
  label,
  locale,
  font,
  reduce,
  isLast,
}: {
  value: number;
  suffix: string;
  label: string;
  locale: "ar" | "en";
  font: string;
  reduce: boolean;
  isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(reduce ? value : 0);
  const startedRef = useRef(false);

  const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const node = ref.current;
    // No node to observe: still show the real number rather than a stuck 0.
    if (!node) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const duration = 1100;
      let start: number | null = null;
      const tick = (now: number) => {
        if (start === null) start = now;
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // If the band is already on screen at mount, fire immediately instead of
    // waiting for an intersection change that may never come.
    const rect = node.getBoundingClientRect();
    const inViewNow =
      rect.top < window.innerHeight && rect.bottom > 0 && rect.height > 0;
    if (inViewNow) {
      run();
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(node);

    // Safety net: never leave the number stuck at 0. If the observer hasn't
    // fired within a short window (e.g. it attached after the element settled
    // in view, or the threshold is never crossed), snap to the final value.
    const fallback = window.setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        setDisplay(value);
      }
    }, 1500);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [value, reduce]);

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center text-center lg:border-e lg:border-rizq-cream/10 lg:px-4 ${
        isLast ? "lg:border-e-0" : ""
      }`}
    >
      <span className="tabular font-sans text-4xl sm:text-5xl lg:text-6xl font-bold text-rizq-gold leading-none">
        {formatter.format(display)}
        {suffix && <span className="text-rizq-gold/90">{suffix}</span>}
      </span>
      <span
        className={`mt-3 text-xs sm:text-sm leading-snug text-rizq-cream/65 max-w-[12rem] ${font}`}
      >
        {label}
      </span>
    </div>
  );
}
