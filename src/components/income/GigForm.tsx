"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createGig, updateGig } from "@/app/actions/gigs/gigs";
import {
  suggestGigCategoryAction,
  checkGigAnomalyAction,
} from "@/app/actions/gigs/incomeAi";
import { track } from "@/lib/analytics/track";
import { Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { ClientPicker } from "@/components/clients/ClientPicker";

type ClientOption = { id: string; name: string };

type GigFormData = {
  id?: string;
  title?: string;
  amount_sar?: number;
  client_id?: string | null;
  status?: string;
  delivery_date?: string | null;
  category?: string | null;
  description?: string | null;
  payment_method?: string | null;
  payment_notes?: string | null;
};

type Props = {
  locale: "ar" | "en";
  mode: "create" | "edit";
  initialData?: GigFormData;
  clients?: ClientOption[];
  onSuccess?: () => void;
};

const GIG_STATUSES = ["pending", "deposit_paid", "paid"] as const;
const PAYMENT_METHODS = ["bank_transfer", "stc_pay", "cash", "other"] as const;

const STATUS_LABELS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  deposit_paid: "دفعة مقدمة",
  paid: "مدفوع",
};

const STATUS_LABELS_EN: Record<string, string> = {
  pending: "Pending",
  deposit_paid: "Deposit paid",
  paid: "Paid",
};

type CategoryHint = {
  category_ar: string;
  category_en: string;
  confidence: number;
};

export function GigForm({ locale, mode, initialData, clients = [], onSuccess }: Props) {
  const t = useTranslations("Income.form");
  const tAi = useTranslations("Income.ai");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [amount, setAmount] = useState(initialData?.amount_sar?.toString() ?? "");
  const [clientId, setClientId] = useState<string>(initialData?.client_id ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "pending");
  const [deliveryDate, setDeliveryDate] = useState(initialData?.delivery_date ?? today);
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method ?? "bank_transfer");
  const [notes, setNotes] = useState(initialData?.payment_notes ?? "");

  // ── Category AI suggestion state ────────────────────────────────────────
  const [categoryHint, setCategoryHint] = useState<CategoryHint | null>(null);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`;
  const labelClass = `block text-sm font-medium text-rizq-ink mb-2 ${font}`;

  // ── Suggest category on title blur / debounce ────────────────────────────
  const handleTitleBlur = useCallback(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 3) return;
    // Only suggest if no category has been set yet (don't override user's pick)
    if (category.trim()) return;

    setIsSuggestingCategory(true);
    suggestDebounceRef.current = setTimeout(async () => {
      try {
        const result = await suggestGigCategoryAction({ title: trimmed });
        if (result.ok && result.suggestion) {
          setCategoryHint(result.suggestion);
        }
      } catch {
        // non-blocking — ignore
      } finally {
        setIsSuggestingCategory(false);
      }
    }, 300);
  }, [title, category]);

  function applyCategory(hint: CategoryHint) {
    setCategory(isAr ? hint.category_ar : hint.category_en);
    setCategoryHint(null);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    // Defense-in-depth: ignore submit events bubbled from a nested/portaled
    // child form (the client "+ Add" dialog). Only this form's own submit
    // should save the project. (Same guard as the invoice/proposal forms.)
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    if (!title.trim()) {
      setError(t("errors.titleRequired"));
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t("errors.amountRequired"));
      return;
    }
    setError(null);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createGig({
          title: title.trim(),
          amount_sar: parsedAmount,
          client_id: clientId || undefined,
          status: status as "pending" | "deposit_paid" | "paid",
          delivery_date: deliveryDate || undefined,
          category: category.trim() || undefined,
          payment_method: paymentMethod as "bank_transfer" | "stc_pay" | "cash" | "other",
        });

        if (!result.ok) {
          if (result.code === "quota_exhausted") {
            setShowUpgradeModal(true);
          } else {
            setError(t("errors.generic"));
          }
          return;
        }

        track("gig_created", { locale });

        // Non-blocking anomaly check after successful create
        if (result.ok && "id" in result) {
          const newId = result.id;
          // Fire and forget — don't await, don't block navigation
          void checkGigAnomalyAction({ gig_id: newId }).catch(() => {});
        }

        // Navigate to the ledger AND refresh — without refresh() the client
        // Router Cache serves a stale /income (missing the just-created gig),
        // which reads as "nothing happened" and causes duplicate saves.
        router.push("/income" as "/income");
        router.refresh();
      } else {
        if (!initialData?.id) return;
        const result = await updateGig({
          id: initialData.id,
          patch: {
            title: title.trim(),
            amount_sar: parsedAmount,
            client_id: clientId || null,
            status: status as "pending" | "deposit_paid" | "in_progress" | "delivered" | "paid" | "overdue" | "cancelled",
            delivery_date: deliveryDate || null,
            category: category.trim() || null,
            payment_method: paymentMethod as "bank_transfer" | "stc_pay" | "cash" | "other",
            payment_notes: notes.trim() || null,
          },
        });

        if (!result.ok) {
          setError(t("errors.generic"));
          return;
        }

        track("gig_updated", { locale });

        // Non-blocking anomaly re-check after edit
        void checkGigAnomalyAction({ gig_id: initialData.id }).catch(() => {});

        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <>
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
        reason="gigs"
      />
    <form
      onSubmit={handleSubmit}
      dir={dir}
      className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-5 animate-fade-in ${font}`}
      noValidate
    >
      <div>
        <p className="eyebrow mb-1 text-rizq-green">{mode === "create" ? t("addTitle") : t("editTitle")}</p>
      </div>

      {/* Amount (primary — big) */}
      <div>
        <label className={labelClass}>{t("amountLabel")} <span className="text-[var(--over)]">*</span></label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("amountPlaceholder")}
            className={`${inputClass} text-2xl font-bold tabular pe-16`}
            dir="ltr"
          />
          <span className={`absolute ${isAr ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-sm text-rizq-ink-soft/60 pointer-events-none ${font}`}>
            {isAr ? "ريال" : "SAR"}
          </span>
        </div>
      </div>

      {/* Title (required) */}
      <div>
        <label className={labelClass}>{t("titleLabel")} <span className="text-[var(--over)]">*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setCategoryHint(null); }}
          onBlur={handleTitleBlur}
          placeholder={t("titlePlaceholder")}
          className={inputClass}
        />
      </div>

      {/* Client picker */}
      <div>
        <label className={labelClass}>
          {t("clientLabel")} <span className={`ms-1 text-rizq-ink-soft/60 font-normal`}>({t("optional")})</span>
        </label>
        <ClientPicker
          value={clientId}
          onChange={setClientId}
          clients={clients}
          locale={locale}
          noneLabel={t("clientNone")}
        />
      </div>

      {/* Status quick-pills */}
      <div>
        <label className={`${labelClass}`}>{t("statusLabel")}</label>
        <div dir={dir} className="flex flex-wrap gap-2">
          {GIG_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                status === s
                  ? "bg-rizq-green text-rizq-cream"
                  : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
            >
              {isAr ? STATUS_LABELS_AR[s] : STATUS_LABELS_EN[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery date */}
      <div>
        <label className={labelClass}>{t("deliveryDateLabel")}</label>
        <input
          type="date"
          value={deliveryDate ?? ""}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className={`${inputClass} font-sans`}
          dir="ltr"
        />
      </div>

      {/* Category */}
      <div>
        <label className={labelClass}>
          {t("categoryLabel")} <span className={`ms-1 text-rizq-ink-soft/60 font-normal`}>({t("optional")})</span>
        </label>
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setCategoryHint(null); }}
              placeholder={t("categoryPlaceholder")}
              className={inputClass}
            />
            {isSuggestingCategory && (
              <span className={`absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2`}>
                <Loader2 size={14} className="animate-spin text-rizq-green/60" />
              </span>
            )}
          </div>

          {/* Category suggestion chip — only when confidence >= 0.6 */}
          {categoryHint && categoryHint.confidence >= 0.6 && (
            <button
              type="button"
              onClick={() => applyCategory(categoryHint)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-green/40 bg-rizq-green/8 px-3 py-1.5 text-sm text-rizq-green hover:bg-rizq-green/15 transition-colors ${font}`}
            >
              <span className="text-xs opacity-70">{tAi("suggestedCategory")}</span>
              <span className="font-medium">
                {isAr ? categoryHint.category_ar : categoryHint.category_en}
              </span>
              <span className="text-xs opacity-70">✓</span>
            </button>
          )}

          {/* Dim hint when confidence < 0.6 */}
          {categoryHint && categoryHint.confidence < 0.6 && (
            <button
              type="button"
              onClick={() => applyCategory(categoryHint)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-1.5 text-sm text-rizq-ink-soft/60 hover:border-rizq-green/30 transition-colors ${font}`}
            >
              <span className="text-xs opacity-70">{tAi("suggestedCategory")}</span>
              <span>{isAr ? categoryHint.category_ar : categoryHint.category_en}</span>
            </button>
          )}
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className={labelClass}>{t("paymentMethodLabel")}</label>
        <div dir={dir} className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                paymentMethod === m
                  ? "bg-rizq-green/15 border border-rizq-green/40 text-rizq-green"
                  : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/30"
              } ${font}`}
            >
              {t(`paymentMethod_${m}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Notes (optional) */}
      {mode === "edit" && (
        <div>
          <label className={labelClass}>
            {t("notesLabel")} <span className={`ms-1 text-rizq-ink-soft/60 font-normal`}>({t("optional")})</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("notesPlaceholder")}
            className={`${inputClass} resize-none`}
          />
        </div>
      )}

      {/* Error */}
      {error && <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? (
          <><Loader2 size={18} className="animate-spin" strokeWidth={2.2} /><span>{t("saving")}</span></>
        ) : (
          <><span>{mode === "create" ? t("save") : t("saveChanges")}</span><span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">→</span></>
        )}
      </button>
    </form>
    </>
  );
}
