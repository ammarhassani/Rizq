"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "@/i18n/navigation";
import { useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Global page-entrance wrapper for the signed-in app. Used once in
 * AppShellClient's content slot so EVERY module page animates in without
 * touching all 21 pages individually.
 *
 * Behaviour (tasteful + fast):
 *   - SSR + pre-hydration: plain <div>, content fully visible. No flash, no
 *     layout shift, works if JS never loads.
 *   - After hydration: a subtle fade + small rise (~0.32s) on mount and on
 *     every pathname change (the wrapper is keyed by pathname, so navigating
 *     between modules re-triggers the entrance — this is the "something just
 *     happened" payoff after the nav progress bar completes).
 *   - prefers-reduced-motion: plain <div>, no motion.
 */
export function AppPageReveal({ children, className }: Props) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (reduce || !hydrated) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
