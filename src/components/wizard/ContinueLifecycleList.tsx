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
    <div dir={dir} className="aurora-ring">
      <section className={`rounded-[20px] bg-[var(--raised)] p-5 ${font}`}>
        <p className={`eyebrow mb-2 ${font}`}>{isAr ? "أكمل ما بدأته" : "Pick up where you left off"}</p>
        <h2 className={`text-base font-semibold text-rizq-ink mb-3 ${font}`}>{t("continueTitle")}</h2>
        <ul className="space-y-2">
        {result.items.map((item) => (
          <li key={`${item.anchorKind}-${item.id}`}>
            <Link
              href={`${item.href}${item.href.includes("?") ? "&" : "?"}guided=1` as `/${string}`}
              className={`flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 hover:border-[var(--acc-line)] hover:bg-[var(--acc-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] ${font}`}
            >
              <span className="min-w-0">
                <span className={`block text-sm font-medium text-rizq-ink truncate ${font}`}>{item.title}</span>
                <span className={`block text-xs text-[var(--content-muted)] ${font}`}>
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
    </div>
  );
}
