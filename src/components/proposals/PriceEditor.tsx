"use client";

/**
 * PriceEditor — manual price override on the pricing section (owner only).
 *
 * The freelancer can set ANY proposed price (above or below the market range);
 * the range + data citation shown above stay as context, not a cap. Patches
 * only the price (artifact pricing.anchor + the price_anchor column) via
 * updateProposalPrice, so prose / scope / citation are untouched. Optimistic +
 * toast + rollback. Hidden in print (it is not part of the document).
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { updateProposalPrice } from "@/app/actions/proposals/updateSection";

type Props = {
  proposalId: string;
  locale: "ar" | "en";
  initialAnchor: number;
  /** Suggested market range — shown as a guide only, never enforced. */
  min?: number;
  max?: number;
};

export function PriceEditor({ proposalId, locale, initialAnchor, min, max }: Props) {
  const tI18n = useTranslations("Proposals.detail");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();

  const [value, setValue] = useState(String(Math.round(initialAnchor)));
  const [saved, setSaved] = useState(Math.round(initialAnchor));
  const [isPending, startTransition] = useTransition();

  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  const dirty = valid && Math.round(parsed) !== saved;

  function fmt(n: number): string {
    return new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
  }

  function save() {
    if (!dirty) return;
    const next = Math.round(parsed);
    startTransition(async () => {
      const result = await updateProposalPrice({ proposal_id: proposalId, anchor: next });
      if (result.ok) {
        setSaved(next);
        toast.success(tI18n("priceUpdated"));
        router.refresh();
      } else {
        toast.error(tI18n("couldnTUpdatePrice"));
      }
    });
  }

  const currencyLabel = tI18n("sar");
  const hasRange = typeof min === "number" && typeof max === "number" && max > 0;

  return (
    <div
      dir={dir}
      className={`print:hidden mt-3 rounded-2xl border border-rizq-green/20 bg-[var(--raised)] p-4 ${font}`}
    >
      <label
        htmlFor="manual-price"
        className={`block text-xs font-medium text-rizq-ink-soft/70 uppercase tracking-wide mb-2 ${font}`}
      >
        {tI18n("adjustPriceManually")}
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="manual-price"
            type="number"
            inputMode="decimal"
            min={0}
            step={50}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            className={`w-full rounded-xl border border-rizq-gold/30 bg-[var(--raised)] px-3.5 py-2.5 pe-12 text-sm text-rizq-ink tabular font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors`}
            dir="ltr"
          />
          <span className={`pointer-events-none absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-xs text-rizq-ink-soft/60 ${font}`}>
            {currencyLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || isPending}
          className={`inline-flex items-center gap-1.5 rounded-full bg-rizq-green text-rizq-cream px-4 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-all disabled:opacity-50 ${font}`}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {tI18n("save")}
        </button>
      </div>
      <p className={`mt-1.5 text-xs text-rizq-ink-soft/60 ${font}`}>
        {hasRange
          ? isAr
            ? `النطاق السوقي ${fmt(min!)} إلى ${fmt(max!)} ريال إرشادي فقط. اضبط أي سعر تراه مناسبًا.`
            : `Market range ${fmt(min!)} to ${fmt(max!)} SAR is a guide. Set any price you see fit.`
          : isAr
            ? "اضبط أي سعر تراه مناسبًا."
            : "Set any price you see fit."}
      </p>
    </div>
  );
}
