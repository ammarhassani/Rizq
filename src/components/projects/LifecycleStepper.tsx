/**
 * LifecycleStepper — Project Lifecycle Wizard (spec 003), task T012.
 *
 * Presentational 3-stage progress (① price & propose · ② set up the work ·
 * ③ get paid) with honest per-stage state badges. The current stage's CTA is
 * passed in as `cta` (a client component), so this stays a server component.
 */
import { getTranslations } from "next-intl/server";
import type { Lifecycle, LifecycleStageKey, LifecycleStageState } from "@/lib/projects/lifecycle";

type Locale = "ar" | "en";

const STAGE_TITLE_KEY: Record<LifecycleStageKey, string> = {
  proposal: "stageProposalTitle",
  project: "stageProjectTitle",
  invoice: "stageInvoiceTitle",
};

const STATE_BADGE: Record<LifecycleStageState, { key: string; cls: string; mark: string }> = {
  done: { key: "stateDone", cls: "bg-emerald-100 text-emerald-700", mark: "✓" },
  current: { key: "stateCurrent", cls: "bg-rizq-green/15 text-rizq-green", mark: "●" },
  next: { key: "stateNext", cls: "bg-rizq-gold/15 text-rizq-ink-soft", mark: "○" },
  skipped: { key: "stateSkipped", cls: "bg-rizq-ink/8 text-rizq-ink-soft", mark: "⤼" },
};

export async function LifecycleStepper({
  lifecycle,
  locale,
  cta,
}: {
  lifecycle: Lifecycle;
  locale: Locale;
  cta?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Wizard" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section dir={dir} className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/70 p-5 mb-6 ${font}`}>
      <ol className="flex flex-col sm:flex-row gap-3 sm:gap-2">
        {lifecycle.stages.map((s, i) => {
          const badge = STATE_BADGE[s.state];
          return (
            <li key={s.key} className="flex-1 flex items-center gap-2">
              <span
                className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${badge.cls}`}
                aria-hidden
              >
                {badge.mark}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold text-rizq-ink leading-tight ${font}`}>
                  {t(STAGE_TITLE_KEY[s.key])}
                </p>
                <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>{t(badge.key)}</p>
              </div>
              {i < lifecycle.stages.length - 1 && (
                <span className="hidden sm:block flex-1 h-px bg-rizq-gold/25 mx-1" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className={`text-xs ${lifecycle.complete ? "text-emerald-700" : "text-rizq-ink-soft/70"} ${font}`}>
          {lifecycle.complete ? t("complete") : ""}
        </p>
        {cta}
      </div>
    </section>
  );
}
