"use client";

/**
 * GuidedFlowOverlay — Project Lifecycle Wizard (spec 003).
 * Shown ONLY during an explicit guided run (`active`) — the "Start a project" /
 * resume flow — never on every incomplete project. Tells the freelancer which
 * step they're on. Desktop: a sleek top-corner card. Mobile: a bottom-docked
 * bar (never over the tabs/title), respecting the safe-area inset. Dismissible
 * for the session; hides once the lifecycle is complete. (UI/UX audit P1.)
 */

import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Lifecycle, LifecycleStageKey } from "@/lib/projects/lifecycle";
import { fmtCount } from "@/lib/format/number";

const STAGE_TITLE_KEY: Record<LifecycleStageKey, string> = {
  proposal: "stageProposalTitle",
  project: "stageProjectTitle",
  invoice: "stageInvoiceTitle",
};

export function GuidedFlowOverlay({
  lifecycle,
  locale,
  active = true,
}: {
  lifecycle: Lifecycle;
  locale: "ar" | "en";
  /** Only render during an explicit guided run. Defaults true for the inherently
   *  guided pages (start wizard, guided proposal); gated by `?guided=1` elsewhere. */
  active?: boolean;
}) {
  const t = useTranslations("Wizard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash; reveal after mount

  const stepIndex = lifecycle.stages.findIndex((s) => s.key === lifecycle.currentStageKey);
  const stepNo = stepIndex >= 0 ? stepIndex + 1 : lifecycle.stages.length;
  const currentTitleKey = lifecycle.currentStageKey ? STAGE_TITLE_KEY[lifecycle.currentStageKey] : null;

  useEffect(() => {
    if (lifecycle.complete) return;
    const hidden = sessionStorage.getItem("rizq_guided_dismissed") === "1";
    setDismissed(hidden);
  }, [lifecycle.complete]);

  if (!active || lifecycle.complete || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem("rizq_guided_dismissed", "1");
    setDismissed(true);
  }

  return (
    <>
      {/* Soft scrim — focuses the page on the guided step. Desktop only (on
          mobile the bar is docked, no scrim needed). Non-blocking. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-30 hidden sm:block"
        style={{
          background:
            "radial-gradient(120% 90% at 100% 0%, rgba(200,169,81,0.10), rgba(26,26,26,0.06) 45%, transparent 70%)",
        }}
      />

      <aside
        dir={dir}
        // Mobile: bottom-docked bar (never over the tabs/title), safe-area aware.
        // Desktop (sm+): top-corner card.
        className={`fixed z-40 inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))]
          sm:inset-x-auto sm:bottom-auto sm:top-20 sm:w-[17rem] sm:max-w-[calc(100vw-2rem)]
          ${isAr ? "sm:left-4" : "sm:right-4"} ${font}`}
        role="status"
        aria-live="polite"
      >
        <div className="rounded-2xl border border-rizq-gold/30 bg-rizq-cream/95 backdrop-blur-sm shadow-xl shadow-rizq-ink/10 p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rizq-green">
              <Sparkles size={13} />
              {t("guidedTitle")}
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("guidedDismiss")}
              className="text-rizq-ink-soft/60 hover:text-rizq-ink transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>
            {t("guidedStepOf", { current: fmtCount(stepNo, locale), total: fmtCount(lifecycle.stages.length, locale) })}
          </p>
          {currentTitleKey && (
            <p className={`text-sm font-bold text-amber-900 leading-snug mb-3 ${font}`}>{t(currentTitleKey)}</p>
          )}

          {/* Mini progress */}
          <ol className="flex items-center gap-1.5">
            {lifecycle.stages.map((s) => {
              const cls =
                s.state === "done"
                  ? "bg-[var(--acc)]"
                  : s.state === "current"
                    ? "bg-[var(--warn)] animate-breathe-amber motion-reduce:animate-none"
                    : s.state === "skipped"
                      ? "bg-rizq-ink/15"
                      : "bg-[#C8A951]/40";
              return <li key={s.key} className={`h-1.5 flex-1 rounded-full ${cls}`} title={t(STAGE_TITLE_KEY[s.key])} />;
            })}
          </ol>
        </div>
      </aside>
    </>
  );
}
