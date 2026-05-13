"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

type Direction = "up" | "side";

type Props = {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  /** If true, animate on mount instead of on scroll-into-view. */
  asMount?: boolean;
  className?: string;
  /** Override the default 0.7s duration */
  duration?: number;
};

/**
 * RTL-aware reveal wrapper. Fail-open by design:
 *
 *   - SSR + before-hydration: renders a plain <div> at default opacity.
 *     Content is always readable even if JS never loads (offline, slow
 *     mobile network, content-blocker interfering with Framer Motion, etc).
 *   - After hydration: switches to motion.div and runs the animation.
 *     Animation is a fade + slide-in (mount) or fade + slide-in on scroll
 *     into view (else).
 *   - prefers-reduced-motion: skips motion entirely, plain <div>.
 *
 * Earlier versions relied on motion.div's `initial: { opacity: 0 }`
 * inlined style — which left content invisible on phone browsers where
 * IntersectionObserver wasn't firing the whileInView trigger. This rewrite
 * stops that class of bug at the cost of one extra render cycle.
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

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Render plain div: SSR, pre-hydration, or reduced-motion users.
  // This guarantees content is visible even if JS never executes.
  if (reduce || !hydrated) {
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
