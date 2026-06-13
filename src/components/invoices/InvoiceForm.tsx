"use client";

/**
 * InvoiceForm — Create/edit invoice form. Phase-4 task P4.4.
 * Mirrors GigForm in structure: ≤30s fast-add, status pills, client picker.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createInvoice } from "@/app/actions/invoices/createInvoice";
import { lineItemTotal } from "@/lib/invoices/items";
import { Loader2, Plus, Trash2 } from "lucide-react";

type ClientOption = { id: string; name: string };

type LineItemDraft = {
  description: string;
  quantity: string;
  unit_price_sar: string;
};

type InvoiceFormInitial = {
  title?: string;
  client_id?: string | null;
  amount_sar?: number;
  gig_id?: string;
};

type Props = {
  locale: "ar" | "en";
  clients?: ClientOption[];
  initial?: InvoiceFormInitial;
};

const PAYMENT_METHODS = ["bank_transfer", "stc_pay", "cash", "other"] as const;

const PAYMENT_METHOD_LABELS_AR: Record<string, string> = {
  bank_transfer: "تحويل بنكي",
  stc_pay: "STC Pay",
  cash: "نقدًا",
  other: "أخرى",
};

const PAYMENT_METHOD_LABELS_EN: Record<string, string> = {
  bank_transfer: "Bank transfer",
  stc_pay: "STC Pay",
  cash: "Cash",
  other: "Other",
};

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().split("T")[0];
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export function InvoiceForm({ locale, clients = [], initial }: Props) {
  const t = useTranslations("Invoices.form");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Line items — initialise from pre-fill if available
  const [items, setItems] = useState<LineItemDraft[]>(() => {
    if (initial?.title && initial?.amount_sar != null) {
      return [
        {
          description: initial.title,
          quantity: "1",
          unit_price_sar: String(initial.amount_sar),
        },
      ];
    }
    return [{ description: "", quantity: "1", unit_price_sar: "" }];
  });

  const [vatPct, setVatPct] = useState("0");
  const [clientId, setClientId] = useState<string>(initial?.client_id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate());

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`;
  const labelClass = `block text-sm font-medium text-rizq-ink mb-2 ${font}`;

  // Computed totals (client-side preview)
  const parsedItems = items.map((item) => ({
    description: item.description,
    quantity: parseNum(item.quantity),
    unit_price_sar: parseNum(item.unit_price_sar),
    total_sar: lineItemTotal(parseNum(item.quantity), parseNum(item.unit_price_sar)),
  }));

  const subtotal = parsedItems.reduce((sum, it) => sum + it.total_sar, 0);
  const vatPctNum = parseNum(vatPct);
  const vatSar = Math.round(subtotal * vatPctNum / 100 * 100) / 100;
  const total = subtotal + vatSar;

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: "1", unit_price_sar: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItemDraft, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function fmtMoney(n: number): string {
    return new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate: at least one item with description + positive price
    const validItems = parsedItems.filter(
      (it) => it.description.trim() && it.unit_price_sar > 0
    );
    if (validItems.length === 0) {
      setError(t("errors.itemRequired"));
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createInvoice({
        items: validItems,
        vat_pct: vatPctNum,
        client_id: clientId || undefined,
        gig_id: initial?.gig_id,
        payment_method: paymentMethod as "bank_transfer" | "stc_pay" | "cash" | "other",
        payment_details: paymentDetails.trim() || undefined,
        due_date: dueDate,
      });

      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setError(t("errors.quotaExhausted"));
        } else {
          setError(t("errors.generic"));
        }
        return;
      }

      router.push(`/invoices/${result.invoice_id}` as `/invoices/${string}`);
    });
  }

  const paymentMethodLabels = isAr ? PAYMENT_METHOD_LABELS_AR : PAYMENT_METHOD_LABELS_EN;

  return (
    <form
      onSubmit={handleSubmit}
      dir={dir}
      className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-6 animate-fade-in ${font}`}
      noValidate
    >
      <div>
        <p className="eyebrow mb-1 text-rizq-green">{t("addTitle")}</p>
      </div>

      {/* Client picker */}
      {clients.length > 0 && (
        <div>
          <label className={labelClass}>
            {t("clientLabel")}{" "}
            <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="">{t("clientNone")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Line items */}
      <div>
        <label className={labelClass}>{t("lineItemsLabel")}</label>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-start"
              dir={dir}
            >
              {/* Description */}
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(idx, "description", e.target.value)}
                placeholder={t("itemDescPlaceholder")}
                className={`${inputClass} col-span-4 sm:col-span-1`}
              />
              {/* Qty */}
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                placeholder={t("itemQtyPlaceholder")}
                className={`w-20 rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-3 text-base text-rizq-ink focus:outline-none focus:border-rizq-green focus:bg-rizq-cream transition-colors text-center tabular font-sans`}
                dir="ltr"
              />
              {/* Unit price */}
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={item.unit_price_sar}
                  onChange={(e) => updateItem(idx, "unit_price_sar", e.target.value)}
                  placeholder="0"
                  className={`w-32 rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-3 pe-10 text-base text-rizq-ink focus:outline-none focus:border-rizq-green focus:bg-rizq-cream transition-colors tabular font-sans`}
                  dir="ltr"
                />
                <span className={`absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-xs text-rizq-ink-soft/60 pointer-events-none ${font}`}>
                  {isAr ? "ر.س" : "SAR"}
                </span>
              </div>
              {/* Remove button */}
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-3 text-rizq-ink-soft/50 hover:text-red-600 transition-colors"
                  aria-label={isAr ? "حذف البند" : "Remove item"}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add item */}
        <button
          type="button"
          onClick={addItem}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-2 text-sm text-rizq-ink-soft hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
        >
          <Plus size={14} />
          {t("addItem")}
        </button>
      </div>

      {/* VAT */}
      <div>
        <label className={labelClass}>
          {t("vatLabel")}{" "}
          <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
        </label>
        <div className="relative w-40">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="any"
            value={vatPct}
            onChange={(e) => setVatPct(e.target.value)}
            className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 pe-10 text-base text-rizq-ink focus:outline-none focus:border-rizq-green focus:bg-rizq-cream transition-colors tabular font-sans`}
            dir="ltr"
          />
          <span className={`absolute ${isAr ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-sm text-rizq-ink-soft/60 pointer-events-none`}>
            %
          </span>
        </div>
      </div>

      {/* Totals preview */}
      {subtotal > 0 && (
        <div
          dir={dir}
          className={`rounded-2xl border border-rizq-gold/20 bg-white/50 p-5 space-y-2 ${font}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-rizq-ink-soft">{t("subtotalLabel")}</span>
            <span className="tabular font-sans text-sm font-medium text-rizq-ink">
              {fmtMoney(subtotal)}{" "}
              <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>
                {isAr ? "ر.س" : "SAR"}
              </span>
            </span>
          </div>
          {vatPctNum > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-rizq-ink-soft">
                {t("vatLabel")} ({vatPctNum}%)
              </span>
              <span className="tabular font-sans text-sm font-medium text-rizq-ink">
                {fmtMoney(vatSar)}{" "}
                <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>
                  {isAr ? "ر.س" : "SAR"}
                </span>
              </span>
            </div>
          )}
          <div className="border-t border-rizq-gold/20 pt-2 flex items-center justify-between">
            <span className={`text-base font-semibold text-rizq-ink ${font}`}>
              {t("totalLabel")}
            </span>
            <span className="tabular font-sans text-xl font-bold text-rizq-green">
              {fmtMoney(total)}{" "}
              <span className={`text-sm font-normal text-rizq-ink-soft ${font}`}>
                {isAr ? "ر.س" : "SAR"}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Payment method pills */}
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
              {paymentMethodLabels[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Payment details */}
      <div>
        <label className={labelClass}>
          {t("paymentDetailsLabel")}{" "}
          <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
        </label>
        <textarea
          value={paymentDetails}
          onChange={(e) => setPaymentDetails(e.target.value)}
          rows={2}
          placeholder={t("paymentDetailsPlaceholder")}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Due date */}
      <div>
        <label className={labelClass}>{t("dueDateLabel")}</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={`${inputClass} font-sans`}
          dir="ltr"
        />
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" strokeWidth={2.2} />
            <span>{t("saving")}</span>
          </>
        ) : (
          <>
            <span>{t("save")}</span>
            <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              →
            </span>
          </>
        )}
      </button>
    </form>
  );
}
