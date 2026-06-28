"use client";

/**
 * Ambient life for the onboarding card (feature 006) — a slow green/gold aurora
 * plus drifting brand-metaphor glyphs (coins → invoice → handshake → growth) that
 * float up and crossfade behind the translucent card. Purposeful, not noisy:
 * everything is low-opacity, slow, and honors prefers-reduced-motion.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Coins, FileText, Handshake, TrendingUp, PenLine, BadgeCheck, Wallet, Sparkles } from "lucide-react";

const GLYPHS = [Coins, FileText, Handshake, TrendingUp, PenLine, Wallet, BadgeCheck, Sparkles];

// Deterministic spread (no Math.random — keeps SSR/CSR stable).
const DRIFTERS = [
  { i: 0, left: 8, size: 30, dur: 17, delay: 0 },
  { i: 1, left: 24, size: 22, dur: 21, delay: 4 },
  { i: 2, left: 42, size: 34, dur: 19, delay: 8 },
  { i: 3, left: 61, size: 24, dur: 23, delay: 2 },
  { i: 4, left: 78, size: 30, dur: 18, delay: 6 },
  { i: 5, left: 90, size: 20, dur: 24, delay: 10 },
  { i: 6, left: 33, size: 26, dur: 22, delay: 13 },
  { i: 7, left: 69, size: 28, dur: 20, delay: 15 },
];

export function OnboardingAurora() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Aurora blobs */}
      <motion.div
        className="absolute -top-24 -start-16 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(26,95,63,0.22), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, 60, -20, 0], y: [0, 40, 10, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -end-20 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(200,169,81,0.20), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, -50, 20, 0], y: [0, -30, 30, 0], scale: [1, 1.08, 1.0, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-28 start-1/4 h-[360px] w-[360px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(26,95,63,0.16), transparent 70%)" }}
        animate={reduce ? undefined : { x: [0, 40, -30, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.98, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Drifting brand-metaphor glyphs */}
      {!reduce &&
        DRIFTERS.map((d) => {
          const Icon = GLYPHS[d.i % GLYPHS.length];
          return (
            <motion.div
              key={d.i}
              className="absolute text-rizq-green/[0.07]"
              style={{ left: `${d.left}%`, bottom: -40 }}
              initial={{ y: 0, opacity: 0, rotate: -8 }}
              animate={{
                y: ["0vh", "-115vh"],
                opacity: [0, 0.9, 0.9, 0],
                rotate: [-8, 6, -4, 8],
              }}
              transition={{ duration: d.dur, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
            >
              <Icon size={d.size} strokeWidth={1.25} />
            </motion.div>
          );
        })}
    </div>
  );
}
