"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * MotionList / MotionItem — a tasteful, reduced-motion-safe animated list.
 *
 * Usage (drop-in over an existing `.map`):
 *
 *   <MotionList className="space-y-3">
 *     {rows.map((r) => (
 *       <MotionItem key={r.id}>
 *         <Card row={r} />
 *       </MotionItem>
 *     ))}
 *   </MotionList>
 *
 * Behaviour (matches Reveal / AppPageReveal house conventions):
 *   - On mount, children stagger in (fade + small vertical rise). Crisp and
 *     fast — short durations, subtle offsets, no spring/bounce.
 *   - On reflow (filter / sort / search), `layout` animates surviving items to
 *     their new positions; AnimatePresence fades added/removed items in/out.
 *     Items MUST be keyed by a stable entity id by the caller.
 *   - prefers-reduced-motion OR pre-hydration: render plain elements (no
 *     variants, no layout animation, no AnimatePresence) so it's instant,
 *     accessible, and visible even if JS never loads.
 *   - RTL-safe: offsets are vertical only (translateY is direction-neutral);
 *     no x-offsets that would fight RTL.
 */

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

const itemTransition: Transition = { duration: 0.2, ease: EASE_OUT };

type ElementTag = "div" | "ul" | "ol" | "article" | "section";

type MotionListProps = {
  children: ReactNode;
  className?: string;
  /** The element to render as the container. Defaults to "div". */
  as?: ElementTag;
};

/**
 * Detects reduced-motion + hydration once, shared by container and items via a
 * tiny module-level flag is overkill — instead each component calls the hook.
 * MotionItem must independently know whether to animate (it can be used with or
 * without MotionList), so both read the same conditions.
 */
function usePlainMotion(): boolean {
  const reduce = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return Boolean(reduce) || !hydrated;
}

export function MotionList({ children, className, as = "div" }: MotionListProps) {
  const plain = usePlainMotion();

  if (plain) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {children}
      </AnimatePresence>
    </MotionTag>
  );
}

type MotionItemProps = {
  children: ReactNode;
  className?: string;
  /** The element to render as the item wrapper. Defaults to "div". */
  as?: ElementTag;
};

export function MotionItem({ children, className, as = "div" }: MotionItemProps) {
  const plain = usePlainMotion();

  if (plain) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      layout
      className={className}
      variants={itemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      transition={itemTransition}
    >
      {children}
    </MotionTag>
  );
}
