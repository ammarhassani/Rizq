"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  /** Accessible text caption — the meaning of the demo lives here. */
  caption: string;
  /** locale, for arabic/english font selection on the shell text */
  isAr: boolean;
  children: ReactNode;
};

/**
 * Reusable shell for an interactive demo: rounded-3xl card with a gold border
 * on a white surface, a title, a text caption (the accessible content for the
 * interactive widget below), and the demo body.
 */
export function DemoCard({ title, caption, isAr, children }: Props) {
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-rizq-gold/30 bg-white p-6 sm:p-7 shadow-[0_8px_30px_-12px_rgba(26,95,63,0.18)]">
      <div className="flex flex-col gap-2">
        <h3 className={`text-lg font-semibold text-rizq-ink leading-snug ${font}`}>
          {title}
        </h3>
        <p className={`text-sm text-rizq-ink-soft leading-relaxed ${font}`}>
          {caption}
        </p>
      </div>
      <div className="rule-gold-h h-px w-10" aria-hidden />
      {/* Interactive body */}
      <div className="mt-1">{children}</div>
    </div>
  );
}
