"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

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
  const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });

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
      setDisplay(Math.round(startValue + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      startRef.current = null;
    };
  }, [value, duration, reduce]);

  return <span className="tabular">{formatter.format(display)}</span>;
}
