"use client";

/**
 * ProjectStartChooser (feature 005, US4) — the project front door. Asks the
 * founder's question "do you have a proposal for this?" and branches:
 *   • use an existing proposal  → ProposalAnchorPicker (anchor)
 *   • create a new proposal      → ProposalFlow (today's studio)
 *   • set up directly            → createBlankProject (money-free)
 * Standalone components are unaffected; this only fronts /projects/start.
 */

import { useState, useTransition } from "react";
import { FileText, Sparkles, Zap, Loader2, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ProposalFlow } from "@/components/proposals/ProposalFlow";
import { ProposalAnchorPicker } from "./ProposalAnchorPicker";
import { createBlankProject } from "@/app/actions/projects/createBlankProject";

type Tpl = { id: string; name_ar: string; name_en: string | null };
type Client = { id: string; name: string };

export function ProjectStartChooser({
  locale,
  templates,
  clients,
}: {
  locale: "ar" | "en";
  templates: Tpl[];
  clients: Client[];
}) {
  const t = useTranslations("Wizard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();

  const [mode, setMode] = useState<"choose" | "existing" | "new">("choose");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setupDirectly() {
    setError(null);
    startTransition(async () => {
      const r = await createBlankProject({ title: t("newProject") });
      if (r.ok) router.push(`/projects/${r.project_id}?guided=1` as `/projects/${string}`);
      else setError(t("error"));
    });
  }

  const BackToChoose = () => (
    <button
      type="button"
      onClick={() => setMode("choose")}
      className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-6 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
    >
      <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden />
      {t("chooserBack")}
    </button>
  );

  if (mode === "new") {
    return (
      <div dir={dir}>
        <BackToChoose />
        <ProposalFlow locale={locale} specialties={[]} templates={templates} clients={clients} />
      </div>
    );
  }

  if (mode === "existing") {
    return (
      <div dir={dir}>
        <BackToChoose />
        <ProposalAnchorPicker locale={locale} onCreateNew={() => setMode("new")} />
      </div>
    );
  }

  const cardCls = `group flex flex-col items-start gap-2 rounded-2xl border border-rizq-gold/25 bg-[var(--raised)] hover:bg-rizq-cream/90 hover:border-rizq-green/40 hover:-translate-y-0.5 transition motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 p-5 text-start ${font}`;

  return (
    <div dir={dir} className={font}>
      <p className={`text-base text-rizq-ink-soft mb-5 ${font}`}>{t("chooserQuestion")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button type="button" onClick={() => setMode("existing")} disabled={isPending} className={cardCls}>
          <FileText size={20} className="text-rizq-green" aria-hidden />
          <span className="text-base font-semibold text-rizq-ink group-hover:text-rizq-green transition-colors">{t("chooserExisting")}</span>
          <span className={`text-sm text-rizq-ink-soft ${font}`}>{t("chooserExistingDesc")}</span>
        </button>

        <button type="button" onClick={() => setMode("new")} disabled={isPending} className={cardCls}>
          <Sparkles size={20} className="text-rizq-gold-deep" aria-hidden />
          <span className="text-base font-semibold text-rizq-ink group-hover:text-rizq-green transition-colors">{t("chooserNew")}</span>
          <span className={`text-sm text-rizq-ink-soft ${font}`}>{t("chooserNewDesc")}</span>
        </button>

        <button type="button" onClick={setupDirectly} disabled={isPending} className={cardCls}>
          {isPending ? <Loader2 size={20} className="animate-spin text-rizq-green" /> : <Zap size={20} className="text-rizq-green" aria-hidden />}
          <span className="text-base font-semibold text-rizq-ink group-hover:text-rizq-green transition-colors">{t("chooserDirect")}</span>
          <span className={`text-sm text-rizq-ink-soft ${font}`}>{t("chooserDirectDesc")}</span>
        </button>
      </div>
      {error && <p role="alert" className={`mt-4 text-sm text-[var(--over)] ${font}`}>{error}</p>}
    </div>
  );
}
