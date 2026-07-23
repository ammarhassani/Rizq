"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Accessible text caption — the meaning of the demo lives here. */
  caption: string;
  /** Small label shown in the faux app-window title bar (e.g. "Pricing tool"). */
  windowLabel: string;
  /** locale, for arabic/english font selection on the shell text */
  isAr: boolean;
  children: ReactNode;
};

/**
 * Polished shell for an interactive demo — meant to read as a genuine product
 * glimpse, not a plain box:
 *  - a faux "app window" top bar (traffic-light dots + a tiny window title)
 *  - a soft cream→white gradient body with layered elevation
 *  - a brand gold top accent line
 *  - title + accessible caption, then the interactive body
 */
export function DemoCard({ title, caption, windowLabel, isAr, children }: Props) {
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-rizq-gold/25 bg-rizq-cream shadow-[0_18px_50px_-22px_rgba(26,95,63,0.32)] transition-shadow duration-300 hover:shadow-[0_24px_60px_-20px_rgba(26,95,63,0.4)]">
      {/* gold accent line at the very top */}
      <span
        aria-hidden
        className="block h-1 w-full bg-gradient-to-r from-rizq-gold/40 via-rizq-gold to-rizq-gold/40"
      />

      {/* Faux app-window title bar */}
      <div className="flex items-center gap-2 border-b border-rizq-gold/15 bg-rizq-cream/60 px-4 py-2.5">
        <span aria-hidden className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rizq-green/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-rizq-gold/45" />
          <span className="h-2.5 w-2.5 rounded-full bg-rizq-ink/15" />
        </span>
        <span
          className={`ms-1 inline-flex items-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-rizq-ink-soft/80 ${font}`}
        >
          <span className="font-arabic font-bold text-rizq-green text-xs">رِزق</span>
          <span aria-hidden className="text-rizq-gold/50">·</span>
          <span>{windowLabel}</span>
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-5 bg-gradient-to-b from-rizq-cream to-rizq-cream-dark/30 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h3 className={`text-lg font-semibold text-rizq-ink leading-snug ${font}`}>
            {title}
          </h3>
          <p className={`text-sm text-rizq-ink-soft leading-relaxed ${font}`}>
            {caption}
          </p>
        </div>

        {/* Interactive body */}
        <div className="mt-auto">{children}</div>
      </div>
    </div>
  );
}
