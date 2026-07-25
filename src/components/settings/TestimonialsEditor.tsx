"use client";

/**
 * TestimonialsEditor — Phase C list editor for client testimonials.
 *
 * Add/remove rows; each row: client name, client title, quote (AR), quote (EN),
 * rating 1-5. Backed by saveTestimonials (REPLACE-ALL). Initial rows are passed
 * from the server page via listTestimonials. House style mirrors ClientForm.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import {
  saveTestimonials,
  type TestimonialRow,
} from "@/app/actions/proposals/testimonials";
import { track } from "@/lib/analytics/track";

type EditableTestimonial = {
  client_name: string;
  client_title: string;
  quote_ar: string;
  quote_en: string;
  rating: number | null;
};

type Props = {
  locale: "ar" | "en";
  initial: TestimonialRow[];
};

const RATINGS = [1, 2, 3, 4, 5] as const;

function toEditable(rows: TestimonialRow[]): EditableTestimonial[] {
  return rows.map((r) => ({
    client_name: r.client_name ?? "",
    client_title: r.client_title ?? "",
    quote_ar: r.quote_ar ?? "",
    quote_en: r.quote_en ?? "",
    rating: r.rating ?? null,
  }));
}

export function TestimonialsEditor({ locale, initial }: Props) {
  const t = useTranslations("StudioProfile.testimonials");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [rows, setRows] = useState<EditableTestimonial[]>(toEditable(initial));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`;
  const labelClass = `block text-sm font-medium text-rizq-ink mb-2 ${font}`;

  const addRow = () => {
    if (rows.length >= 20) return;
    setRows([
      ...rows,
      { client_name: "", client_title: "", quote_ar: "", quote_en: "", rating: null },
    ]);
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const updateRow = (
    idx: number,
    field: keyof EditableTestimonial,
    val: string | number | null
  ) => setRows(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));

  function handleSave() {
    setError(null);
    setSaved(false);

    const payload = rows.map((r) => ({
      client_name: r.client_name.trim() || undefined,
      client_title: r.client_title.trim() || undefined,
      quote_ar: r.quote_ar.trim() || undefined,
      quote_en: r.quote_en.trim() || undefined,
      rating: r.rating ?? undefined,
    }));

    startTransition(async () => {
      const result = await saveTestimonials(payload);
      if (!result.ok) {
        setError(t("errorSave"));
        return;
      }
      // Mirror the saved (cleaned) state: drop rows with no quote in either lang.
      setRows(rows.filter((r) => r.quote_ar.trim() || r.quote_en.trim()));
      track("testimonials_saved", { locale });
      setSaved(true);
    });
  }

  return (
    <div dir={dir} className={`space-y-4 ${font}`}>
      {rows.length === 0 && (
        <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("empty")}</p>
      )}

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-rizq-gold/30 bg-rizq-cream/40 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs text-rizq-ink-soft ${font}`}>
                {isAr ? `توصية ${idx + 1}` : `Testimonial ${idx + 1}`}
              </span>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="p-1.5 text-rizq-ink-soft hover:text-[var(--over)] transition-colors"
                aria-label={t("remove")}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t("clientName")}</label>
                <input
                  type="text"
                  value={row.client_name}
                  onChange={(e) => updateRow(idx, "client_name", e.target.value)}
                  placeholder={t("clientNamePlaceholder")}
                  className={inputClass}
                  maxLength={120}
                />
              </div>
              <div>
                <label className={labelClass}>{t("clientTitle")}</label>
                <input
                  type="text"
                  value={row.client_title}
                  onChange={(e) => updateRow(idx, "client_title", e.target.value)}
                  placeholder={t("clientTitlePlaceholder")}
                  className={inputClass}
                  maxLength={120}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>{t("quoteAr")}</label>
              <textarea
                value={row.quote_ar}
                onChange={(e) => updateRow(idx, "quote_ar", e.target.value)}
                rows={3}
                placeholder={t("quoteArPlaceholder")}
                className={`${inputClass} resize-none`}
                maxLength={1000}
                dir="rtl"
              />
            </div>

            <div>
              <label className={labelClass}>
                {t("quoteEn")}{" "}
                <span className="ms-1 text-rizq-ink-soft/60 font-normal">
                  ({t("optional")})
                </span>
              </label>
              <textarea
                value={row.quote_en}
                onChange={(e) => updateRow(idx, "quote_en", e.target.value)}
                rows={3}
                placeholder={t("quoteEnPlaceholder")}
                className={`${inputClass} resize-none font-sans`}
                maxLength={1000}
                dir="ltr"
              />
            </div>

            {/* Rating */}
            <div>
              <label className={labelClass}>{t("rating")}</label>
              <div className="flex gap-2" dir="ltr">
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateRow(idx, "rating", row.rating === r ? null : r)}
                    className={`text-2xl leading-none p-1 transition-colors ${
                      row.rating && r <= row.rating
                        ? "text-rizq-gold"
                        : "text-rizq-gold/30 hover:text-rizq-gold/60"
                    }`}
                    aria-label={`${r} ${t("stars")}`}
                    aria-pressed={row.rating === r}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rows.length < 20 && (
        <button
          type="button"
          onClick={addRow}
          className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-rizq-gold/40 px-4 py-3 text-sm text-rizq-ink-soft hover:text-rizq-green hover:border-rizq-green/40 transition-colors ${font}`}
        >
          <Plus size={16} />
          <span>{t("add")}</span>
        </button>
      )}

      {error && (
        <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`group inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" strokeWidth={2.2} />
              <span>{t("saving")}</span>
            </>
          ) : (
            <span>{t("save")}</span>
          )}
        </button>
        {saved && !isPending && (
          <span className={`inline-flex items-center gap-1.5 text-sm text-rizq-green ${font}`}>
            <Check size={16} strokeWidth={2.4} />
            {t("savedConfirm")}
          </span>
        )}
      </div>
    </div>
  );
}
