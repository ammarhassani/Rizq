"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";

type Direction = "up" | "side";

type Props = {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  /** If true, animate on mount instead of on scroll-into-view. Use for the hero. */
  asMount?: boolean;
  className?: string;
  /** Override the default 0.7s duration */
  duration?: number;
};

/**
 * RTL-aware reveal wrapper.
 *   direction="up"   → fade + slide from below (locale-agnostic)
 *   direction="side" → fade + slide from the visual start
 *                      (right in RTL/ar, left in LTR/en)
 *
 * Respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  asMount = false,
  className,
  duration = 0.7,
}: Props) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const reduce = useReducedMotion();

  if (reduce) {
    // Render as-is — no motion. Still respect spacing.
    return <div className={className}>{children}</div>;
  }

  const fromX = direction === "side" ? (isRtl ? 28 : -28) : 0;
  const fromY = direction === "up" ? 24 : 0;

  const initial = { opacity: 0, x: fromX, y: fromY };
  const target = { opacity: 1, x: 0, y: 0 };

  const triggerProps = asMount
    ? { initial, animate: target }
    : {
        initial,
        whileInView: target,
        viewport: { once: true, margin: "-80px" } as const,
      };

  return (
    <motion.div
      className={className}
      {...triggerProps}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
