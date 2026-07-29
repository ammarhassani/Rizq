"use client";

/**
 * FeeForm — create a categorized fixed-fee preset.
 *
 * Full form, no partial data. Used embedded in FeeDialog (the invoice
 * builder's "+ Add fee", same popped-window workflow as items). On create it
 * saves a reusable preset and returns it so the caller can add it onto the
 * current invoice.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createFeePreset, updateFeePreset, type CreatedFeePreset } from "@/app/actions/fees/fees";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import { attempt } from "@/lib/actions/attempt";

type Props = {
  locale: "ar" | "en";
  /** "create" (default) inserts a new preset; "edit" updates initialData.id. */
  mode?: "create" | "edit";
  initialData?: CreatedFeePreset;
  /** Returns the saved preset to the caller (fires on both create and edit). */
  onSaved?: (preset: CreatedFeePreset) => void;
  embedded?: boolean;
};

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export function FeeForm({ locale, mode = "create", initialData, onSaved, embedded = false }: Props) {
  const t = useTranslations("Fees.form");
  const tCommon = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [feeType, setFeeType] = useState<"fixed" | "percentage">(
    initialData?.fee_type ?? "fixed"
  );
  const [amount, setAmount] = useState(
    initialData?.amount_sar != null && (initialData.fee_type ?? "fixed") === "fixed"
      ? String(initialData.amount_sar)
      : ""
  );
  const [percentage, setPercentage] = useState(
    initialData?.percentage != null ? String(initialData.percentage) : ""
  );

  const inputClass = cn(
    "w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink transition-colors",
    "focus:border-rizq-green focus:bg-rizq-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream",
    "placeholder:text-rizq-ink-soft/50",
    font
  );
  const labelClass = cn("block text-sm font-medium text-rizq-ink mb-2", font);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Embedded in a dialog that may live inside another <form> (e.g. the invoice
    // builder). React bubbles submit through the component tree, so stop it here
    // or the parent form would also submit (phantom invoice).
    e.stopPropagation();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("errors.nameRequired"));
      return;
    }
    const isPct = feeType === "percentage";
    const amt = parseNum(amount);
    const pct = parseNum(percentage);
    if (isPct) {
      if (!percentage.trim() || pct <= 0 || pct > 100) {
        setError(t("enterPercentageBetween0100"));
        return;
      }
    } else if (!amount.trim() || amt <= 0) {
      setError(t("errors.amountRequired"));
      return;
    }
    setError(null);

    startTransition(async () => {
      if (mode === "edit" && initialData) {
        const result = await attempt(() =>
          updateFeePreset({
            id: initialData.id,
            patch: {
              name: trimmedName,
              category: category.trim() || null,
              fee_type: feeType,
              amount_sar: isPct ? 0 : amt,
              percentage: isPct ? pct : null,
            },
          }),
        );
        if (!result) {
          // The request never came back — see lib/actions/attempt.
          setError(tCommon("saveUnconfirmed"));
          return;
        }
        if (!result.ok) {
          setError(t("errors.generic"));
          return;
        }
        track("fee_preset_updated", { locale });
        onSaved?.(result.preset);
        return;
      }

      const result = await attempt(() =>
        createFeePreset({
          name: trimmedName,
          category: category.trim() || undefined,
          fee_type: feeType,
          amount_sar: isPct ? 0 : amt,
          percentage: isPct ? pct : undefined,
        }),
      );
      if (!result) {
        // The request never came back — see lib/actions/attempt.
        setError(tCommon("saveUnconfirmed"));
        return;
      }

      if (!result.ok) {
        setError(t("errors.generic"));
        return;
      }

      track("fee_preset_created", { locale });
      onSaved?.(result.preset);
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
          : `card-wahaj p-7 sm:p-10 space-y-5 animate-fade-in ${font}`
      }
      noValidate
    >
      {/* Name (required) */}
      <div>
        <label className={labelClass}>
          {t("nameLabel")} <span className="text-[var(--over)]">*</span>
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

      {/* Fee type — fixed amount or a percentage of the items subtotal */}
      <div>
        <label className={labelClass}>{t("feeType")}</label>
        <div dir={dir} className="inline-flex rounded-full border border-rizq-gold/30 bg-rizq-cream/60 p-1">
          {([
            { key: "fixed", label: t("fixedValue") },
            { key: "percentage", label: t("percentage") },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFeeType(opt.key)}
              aria-pressed={feeType === opt.key}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all",
                feeType === opt.key
                  ? "bg-rizq-green text-rizq-cream"
                  : "text-rizq-ink-soft hover:text-rizq-ink",
                font
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Value (fixed amount OR percentage) + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {feeType === "percentage" ? (
            <>
              <label className={labelClass}>
                {t("percentage")} <span className="text-[var(--over)]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="0"
                  className={cn(inputClass, "pe-10 tabular font-sans")}
                  dir="ltr"
                />
                <span className={`pointer-events-none absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-xs text-rizq-ink-soft/60 ${font}`}>
                  %
                </span>
              </div>
              <p className={`mt-1.5 text-xs text-rizq-ink-soft/60 ${font}`}>
                {isAr
                  ? "نسبة من المجموع الفرعي للبنود (قبل الضريبة)."
                  : "Percent of the items subtotal (before VAT)."}
              </p>
            </>
          ) : (
            <>
              <label className={labelClass}>
                {t("amountLabel")} <span className="text-[var(--over)]">*</span>
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
                  {t("sar")}
                </span>
              </div>
            </>
          )}
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

      {error && <p role="alert" className={cn("text-sm text-[var(--over)]", font)}>{error}</p>}

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
          <span>{mode === "edit" ? t("saveChanges") : t("save")}</span>
        )}
      </button>
    </form>
  );
}
