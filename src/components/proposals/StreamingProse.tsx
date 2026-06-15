"use client";

/**
 * StreamingProse — Phase D helper.
 *
 * A lightweight opacity/blur reveal wrapper for the live AI prose pass. While
 * the draft streams, the proposal artifact re-renders with progressively
 * filled prose sections; wrapping the artifact in this gives the freshly
 * arriving text a gentle settle instead of a hard pop.
 *
 * Fail-open + reduced-motion safe: when the user prefers reduced motion (or
 * `active` is false, i.e. streaming has finished) it renders a plain wrapper at
 * full opacity. The content is never hidden by this component.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** True while the stream is in progress (drives the subtle pulse). */
  active: boolean;
  className?: string;
};

export function StreamingProse({ children, active, className }: Props) {
  const reduce = useReducedMotion();

  if (reduce || !active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
