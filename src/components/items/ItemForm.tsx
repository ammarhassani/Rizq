"use client";

/**
 * ItemForm — create a catalog item (product/service).
 *
 * Full form, no partial data. Used standalone and embedded in ItemDialog
 * (the invoice builder's "+ Add item" for an unlisted item). On create it
 * returns the full CreatedItem so the caller can select it onto the invoice.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createItem, updateItem, type CreatedItem } from "@/app/actions/items/items";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import { clampMoneyInput, roundHalala } from "@/lib/money/halala";
import { attempt } from "@/lib/actions/attempt";

type Props = {
  locale: "ar" | "en";
  /** "create" (default) inserts a new item; "edit" updates initialData.id. */
  mode?: "create" | "edit";
  /** Existing item to edit (required when mode="edit"). */
  initialData?: CreatedItem;
  /** Returns the saved item to the caller (fires on both create and edit). */
  onSaved?: (item: CreatedItem) => void;
  /** Drop the outer card chrome when rendered inside a dialog. */
  embedded?: boolean;
};

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export function ItemForm({ locale, mode = "create", initialData, onSaved, embedded = false }: Props) {
  const t = useTranslations("Items.form");
  const tCommon = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [unitPrice, setUnitPrice] = useState(
    initialData?.unit_price_sar != null ? String(initialData.unit_price_sar) : ""
  );
  const [category, setCategory] = useState(initialData?.category ?? "");

  const inputClass = cn(
    "w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink transition-colors",
    "focus:border-rizq-green focus:bg-rizq-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream",
    "placeholder:text-rizq-ink-soft/50",
    font
  );
  const labelClass = cn("block text-sm font-medium text-rizq-ink mb-2", font);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // This form is embedded in a dialog that may render (via React portal) inside
    // another <form> such as the invoice builder. React bubbles submit events
    // through the component tree, so without this the parent form would ALSO
    // submit (creating a phantom invoice). Stop the bubble.
    e.stopPropagation();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("errors.nameRequired"));
      return;
    }
    const price = parseNum(unitPrice);
    if (!unitPrice.trim() || price <= 0) {
      setError(t("errors.priceRequired"));
      return;
    }
    setError(null);

    startTransition(async () => {
      if (mode === "edit" && initialData) {
        const result = await attempt(() =>
          updateItem({
            id: initialData.id,
            patch: {
              name: trimmedName,
              description: description.trim() || null,
              unit_price_sar: price,
              category: category.trim() || null,
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
        track("item_updated", { locale });
        onSaved?.(result.item);
        return;
      }

      const result = await attempt(() =>
        createItem({
          name: trimmedName,
          description: description.trim() || undefined,
          unit_price_sar: price,
          category: category.trim() || undefined,
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

      track("item_created", { locale });
      onSaved?.(result.item);
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

      {/* Unit price (required) + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            {t("unitPriceLabel")} <span className="text-[var(--over)]">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              // SAR has halalas: two decimals. A third one printed rounded while the line
              // total used the unrounded value, and the two disagreed on the document.
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(clampMoneyInput(e.target.value))}
              onBlur={(e) => {
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n)) setUnitPrice(String(roundHalala(n)));
              }}
              placeholder="0"
              className={cn(inputClass, "pe-12 tabular font-sans")}
              dir="ltr"
            />
            <span className={`pointer-events-none absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-xs text-rizq-ink-soft/60 ${font}`}>
              {t("sar")}
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

      {/* Description */}
      <div>
        <label className={labelClass}>
          {t("descriptionLabel")}{" "}
          <span className="ms-1 font-normal text-rizq-ink-soft/60">({t("optional")})</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("descriptionPlaceholder")}
          className={cn(inputClass, "resize-none")}
        />
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
