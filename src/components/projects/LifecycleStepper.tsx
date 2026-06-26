/**
 * LifecycleStepper — Project Lifecycle Wizard (spec 003), task T012.
 *
 * 3-stage progress (① price & propose · ② set up the work · ③ get paid) with
 * honest per-stage state. Incomplete stages (current/next) **glow and breathe
 * amber**; done = solid green, skipped = muted. Stages with a `target` are
 * clickable so the freelancer can jump back and forth across the lifecycle.
 * Server component; the current stage's CTA is passed in as `cta`.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Lifecycle, LifecycleStageKey, LifecycleStageState } from "@/lib/projects/lifecycle";

type Locale = "ar" | "en";

const STAGE_TITLE_KEY: Record<LifecycleStageKey, string> = {
  proposal: "stageProposalTitle",
  project: "stageProjectTitle",
  invoice: "stageInvoiceTitle",
};

// "current" (in progress) is rendered distinctly — a solid amber dot with a
// live pulsing halo (animate-ping) — so it reads as the active step, not just a
// darker shade of "next". "next" softly breathes amber; done/skipped are calm.
const STATE_BADGE: Record<LifecycleStageState, { key: string; cls: string; mark: string }> = {
  done: { key: "stateDone", cls: "bg-emerald-100 text-emerald-700", mark: "✓" },
  current: { key: "stateCurrent", cls: "", mark: "" },
  next: { key: "stateNext", cls: "bg-[#C8A951]/15 text-amber-700/80 animate-breathe-amber", mark: "○" },
  skipped: { key: "stateSkipped", cls: "bg-rizq-ink/8 text-rizq-ink-soft", mark: "⤼" },
};

export async function LifecycleStepper({
  lifecycle,
  locale,
  cta,
  targets = {},
}: {
  lifecycle: Lifecycle;
  locale: Locale;
  cta?: React.ReactNode;
  /** Optional per-stage navigation hrefs (unprefixed) — enables back/forth jumps. */
  targets?: Partial<Record<LifecycleStageKey, string>>;
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
          const href = targets[s.key];
          const isCurrent = s.state === "current";
          const dot = isCurrent ? (
            // Active step: solid amber dot + a live pulsing halo.
            <span className="relative flex-shrink-0 h-7 w-7" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-[0_0_10px_2px_rgba(245,158,11,0.5)]">
                ◆
              </span>
            </span>
          ) : (
            <span
              className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${badge.cls}`}
              aria-hidden
            >
              {badge.mark}
            </span>
          );
          const inner = (
            <>
              {dot}
              <span className="min-w-0">
                <span
                  className={`block text-sm leading-tight ${font} ${
                    isCurrent ? "font-bold text-amber-900" : "font-semibold text-rizq-ink"
                  }`}
                >
                  {t(STAGE_TITLE_KEY[s.key])}
                </span>
                <span
                  className={`block text-xs ${font} ${
                    isCurrent
                      ? "font-medium text-amber-700"
                      : s.state === "next"
                        ? "text-amber-700/70"
                        : "text-rizq-ink-soft/70"
                  }`}
                >
                  {t(badge.key)}
                </span>
              </span>
            </>
          );
          return (
            <li key={s.key} className="flex-1 flex items-center gap-2">
              {href ? (
                <Link
                  href={href as `/${string}`}
                  className="flex items-center gap-2 min-w-0 rounded-lg -m-1 p-1 hover:bg-rizq-gold/10 transition-colors"
                >
                  {inner}
                </Link>
              ) : (
                <span className="flex items-center gap-2 min-w-0">{inner}</span>
              )}
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
