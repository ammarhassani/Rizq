"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { fmtMoney } from "@/lib/format/number";

type Props = {
  value: number;
  duration?: number;
  locale?: "ar" | "en";
};

/**
 * Count-up to {value} over {duration} seconds. Uses locale-aware digit
 * rendering (Eastern Arabic in /ar). Respects prefers-reduced-motion.
 */
export function AnimatedNumber({ value, duration = 1.2, locale }: Props) {
  // Fallback the locale if not supplied — useLocale from framer-motion is
  // unrelated to next-intl, so callers must pass it explicitly.
  const reduce = useReducedMotion();
  /**
   * Halalas survive if the value has them.
   *
   * This always formatted with maximumFractionDigits: 0, so an invoice of 9,938.21 SAR was
   * announced as ٩٬٩٣٨ in the header strip while the artifact directly below it printed
   * ٩٬٩٣٨٫٢١ — the same view stating two different amounts owed. A round figure still
   * renders round, so nothing gains a trailing ٫٠٠.
   */
  const digits: 0 | 2 = Number.isInteger(value) ? 0 : 2;
  const format = (n: number) => fmtMoney(n, locale === "ar" ? "ar" : "en", digits);

  const [display, setDisplay] = useState(reduce ? value : 0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const startValue = 0;
    const delta = value - startValue;
    let raf = 0;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / (duration * 1000));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      // The last frame lands on the exact value; rounding every frame used to make the
      // final figure whatever the tween happened to reach.
      setDisplay(t < 1 ? startValue + delta * eased : value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      startRef.current = null;
    };
  }, [value, duration, reduce]);

  return <span className="tabular">{format(display)}</span>;
}
