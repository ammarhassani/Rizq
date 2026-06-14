"use client";

/**
 * FeeForm — create a categorized fixed-fee preset.
 *
 * Full form, no partial data. Used embedded in AddFeeDialog (the invoice
 * builder's "+ Add fee", same popped-window workflow as items). On create it
 * saves a reusable preset and returns it so the caller can add it onto the
 * current invoice.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createFeePreset, type CreatedFeePreset } from "@/app/actions/fees/fees";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

type Props = {
  locale: "ar" | "en";
  onCreated?: (preset: CreatedFeePreset) => void;
  embedded?: boolean;
};

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export function FeeForm({ locale, onCreated, embedded = false }: Props) {
  const t = useTranslations("Fees.form");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const inputClass = cn(
    "w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink transition-colors",
    "focus:border-rizq-green focus:bg-rizq-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream",
    "placeholder:text-rizq-ink-soft/50",
    font
  );
  const labelClass = cn("block text-sm font-medium text-rizq-ink mb-2", font);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("errors.nameRequired"));
      return;
    }
    const amt = parseNum(amount);
    if (!amount.trim() || amt <= 0) {
      setError(t("errors.amountRequired"));
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createFeePreset({
        name: trimmedName,
        category: category.trim() || undefined,
        amount_sar: amt,
      });

      if (!result.ok) {
        setError(t("errors.generic"));
        return;
      }

      track("fee_preset_created", { locale });
      onCreated?.(result.preset);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      dir={dir}
      className={
        embedded
          ? `space-y-5 ${font}`
          : `rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-5 animate-fade-in ${font}`
      }
      noValidate
    >
      {/* Name (required) */}
      <div>
        <label className={labelClass}>
          {t("nameLabel")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className={inputClass}
          autoComplete="off"
        />
      </div>

      {/* Amount (required) + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            {t("amountLabel")} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={cn(inputClass, "pe-12 tabular font-sans")}
              dir="ltr"
            />
            <span className={`pointer-events-none absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-xs text-rizq-ink-soft/60 ${font}`}>
              {isAr ? "ر.س" : "SAR"}
            </span>
          </div>
        </div>
        <div>
          <label className={labelClass}>
            {t("categoryLabel")}{" "}
            <span className="ms-1 font-normal text-rizq-ink-soft/60">({t("optional")})</span>
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t("categoryPlaceholder")}
            className={inputClass}
            autoComplete="off"
          />
        </div>
      </div>

      {error && <p role="alert" className={cn("text-sm text-red-700", font)}>{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "group inline-flex w-full items-center justify-center gap-2 rounded-full bg-rizq-green px-7 py-3.5 text-sm font-medium text-rizq-cream transition-all hover:-translate-y-0.5 hover:bg-rizq-green-dark disabled:opacity-70 disabled:hover:translate-y-0",
          font
        )}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
            <span>{t("saving")}</span>
          </>
        ) : (
          <span>{t("save")}</span>
        )}
      </button>
    </form>
  );
}
