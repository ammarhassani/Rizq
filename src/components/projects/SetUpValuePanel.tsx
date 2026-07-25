"use client";

/**
 * SetUpValuePanel (feature 005, US4) — shown on a blank (gig-less) project so the
 * freelancer can add the money child when ready. Calls addGigToProject; the
 * lifecycle then advances to the invoice stage. Money-free until used.
 */

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addGigToProject } from "@/app/actions/projects/addGigToProject";

export function SetUpValuePanel({ locale, projectId }: { locale: "ar" | "en"; projectId: string }) {
  const t = useTranslations("Wizard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();

  const [amount, setAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!(amount > 0)) {
      setError(t("error"));
      return;
    }
    startTransition(async () => {
      const r = await addGigToProject({ project_id: projectId, amount_sar: amount });
      if (r.ok) router.refresh();
      else setError(t("error"));
    });
  }

  return (
    <section dir={dir} className="mb-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("setUpValue")}</h2>
      <div className={`rounded-2xl border border-rizq-gold/25 bg-rizq-cream/70 p-5 ${font}`}>
        <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>{t("setUpValueDesc")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="setup-amount" className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
              {t("amountSar")}
            </label>
            <input
              id="setup-amount"
              type="number"
              min={1}
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className={`tabular w-40 rounded-xl border border-rizq-gold/30 bg-[var(--raised)] px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} aria-hidden />}
            {t("setUpValue")}
          </button>
        </div>
        {error && <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>{error}</p>}
      </div>
    </section>
  );
}
