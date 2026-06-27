/**
 * ContinueLifecycleList — Project Lifecycle Wizard (spec 003), task T014.
 *
 * Dashboard "pick up where you left off" — in-progress projects + draft-only
 * proposals, each resuming at its current stage. Server component.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listInProgressLifecycles } from "@/app/actions/projects/listInProgressLifecycles";
import type { LifecycleStageKey, LifecycleNextAction } from "@/lib/projects/lifecycle";

const STAGE_KEY: Record<LifecycleStageKey, string> = {
  proposal: "stageProposalTitle",
  project: "stageProjectTitle",
  invoice: "stageInvoiceTitle",
};
const ACTION_KEY: Record<NonNullable<LifecycleNextAction>, string> = {
  finalize_proposal: "ctaFinalizeProposal",
  set_up_project: "ctaSetUpProject",
  create_invoice: "ctaCreateInvoice",
  send_invoice: "ctaSendInvoice",
  mark_paid: "ctaMarkPaid",
};

export async function ContinueLifecycleList({ locale }: { locale: "ar" | "en" }) {
  const result = await listInProgressLifecycles(5);
  if (!result.ok || result.items.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "Wizard" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section dir={dir} className={`rounded-2xl border border-rizq-gold/20 bg-white/60 p-5 ${font}`}>
      <h2 className={`text-sm font-semibold text-rizq-ink mb-3 ${font}`}>{t("continueTitle")}</h2>
      <ul className="space-y-2">
        {result.items.map((item) => (
          <li key={`${item.anchorKind}-${item.id}`}>
            <Link
              href={`${item.href}${item.href.includes("?") ? "&" : "?"}guided=1` as `/${string}`}
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-rizq-cream/50 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
            >
              <span className="min-w-0">
                <span className={`block text-sm font-medium text-rizq-ink truncate ${font}`}>{item.title}</span>
                <span className={`block text-xs text-rizq-ink-soft/70 ${font}`}>
                  {item.currentStageKey ? t(STAGE_KEY[item.currentStageKey]) : t("complete")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-rizq-green shrink-0">
                {item.nextAction ? t(ACTION_KEY[item.nextAction]) : t("ctaContinue")}
                <span className="ltr:rotate-0 rtl:rotate-180">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
