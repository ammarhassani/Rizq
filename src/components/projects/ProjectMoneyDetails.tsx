"use client";

/**
 * ProjectMoneyDetails — Project Lifecycle Wizard (spec 003), task T009.
 *
 * Stage ② money-details step on the project page: pre-filled deposit %,
 * delivery date, and payment method, saved via the existing updateGig action
 * (the gig_compute_before trigger recomputes deposit/remaining). Reuses the
 * Income.form payment-method labels — no rebuilt money logic.
 */

import { useState, useTransition } from "react";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateGig } from "@/app/actions/gigs/gigs";

type Locale = "ar" | "en";
type PaymentMethod = "bank_transfer" | "stc_pay" | "cash" | "other";

type Props = {
  locale: Locale;
  gigId: string;
  initial: {
    amount_sar: number | null;
    deposit_pct: number | null;
    delivery_date: string | null;
    payment_method: string | null;
  };
};

const PAYMENT_METHODS: PaymentMethod[] = ["bank_transfer", "stc_pay", "cash", "other"];

export function ProjectMoneyDetails({ locale, gigId, initial }: Props) {
  const t = useTranslations("Projects");
  const tForm = useTranslations("Income.form");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const [amount, setAmount] = useState<number>(initial.amount_sar ?? 0);
  const [depositPct, setDepositPct] = useState<number>(initial.deposit_pct ?? 50);
  const [deliveryDate, setDeliveryDate] = useState<string>(initial.delivery_date ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (initial.payment_method as PaymentMethod) ?? "bank_transfer"
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Collapsed by default — the Overview is for reading status; editing is opt-in. (Audit P2)
  const [open, setOpen] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateGig({
        id: gigId,
        patch: {
          ...(amount > 0 ? { amount_sar: amount } : {}),
          deposit_pct: depositPct,
          delivery_date: deliveryDate || null,
          payment_method: paymentMethod,
        },
      });
      if (!result.ok) {
        setError(isAr ? "تعذّر الحفظ. حاول مرة أخرى." : "Could not save. Try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const fieldCls = `w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`;

  return (
    <section dir={dir} className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`eyebrow text-rizq-green ${font}`}>{t("moneyDetailsTitle")}</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-white/60 px-3 py-1.5 text-xs font-medium text-rizq-ink-soft hover:text-rizq-ink hover:border-rizq-green/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
        >
          <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          {open ? (isAr ? "إغلاق" : "Close") : (isAr ? "تعديل" : "Edit")}
        </button>
      </div>
      {open && (
      <div className={`rounded-2xl border border-rizq-gold/20 bg-white/60 p-5 space-y-4 ${font}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount-sar" className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
              {tForm("amountLabel")}
            </label>
            <input
              id="amount-sar"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className={`${fieldCls} tabular`}
            />
          </div>
          <div>
            <label htmlFor="deposit-pct" className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
              {t("depositPctLabel")}
            </label>
            <input
              id="deposit-pct"
              type="number"
              min={0}
              max={100}
              value={depositPct}
              onChange={(e) => setDepositPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className={`${fieldCls} tabular`}
            />
          </div>
          <div>
            <label htmlFor="delivery-date" className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
              {tForm("deliveryDateLabel")}
            </label>
            <input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div>
            <label htmlFor="payment-method" className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
              {tForm("paymentMethodLabel")}
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={fieldCls}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {tForm(`paymentMethod_${m}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-70 ${font}`}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isPending ? t("savingMoneyDetails") : t("saveMoneyDetails")}
          </button>
          {saved && !isPending && (
            <span className={`inline-flex items-center gap-1 text-sm text-emerald-700 ${font}`}>
              <Check size={14} /> {t("savedMoneyDetails")}
            </span>
          )}
          {error && (
            <span role="alert" className={`text-sm text-red-700 ${font}`}>
              {error}
            </span>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
