"use client";

/**
 * InvoiceForm — create an invoice.
 *
 * Founder rules:
 *  - Client is REQUIRED (ClientPicker, with a full "+ Add client" popped form).
 *  - At least one item is REQUIRED. Items are selected from the catalog via
 *    ItemPicker; an unlisted item opens the full "+ Add item" popped dialog.
 *  - "Tax & Fees": VAT is fixed — a 15% toggle (on → 15%, off → 0%). Fees are
 *    categorized fixed presets added via FeePicker; a new fee opens the full
 *    "+ Add fee" popped dialog. VAT applies to items + fees (mirrors the DB
 *    trigger and computeInvoiceTotals).
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createInvoice } from "@/app/actions/invoices/createInvoice";
import { computeInvoiceTotals, lineItemTotal, resolveFeeAmount } from "@/lib/invoices/items";
import type { InvoiceFee } from "@/lib/invoices/items";
import { Loader2, Trash2, Check } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { ItemPicker } from "@/components/items/ItemPicker";
import { FeePicker } from "@/components/fees/FeePicker";
import type { CreatedItem } from "@/app/actions/items/items";
import type { CreatedFeePreset } from "@/app/actions/fees/fees";
import type { VatEligibility } from "@/lib/invoices/vatEligibility";
import { Link } from "@/i18n/navigation";
import { clampMoneyInput, roundHalala } from "@/lib/money/halala";
import { fmtRate } from "@/lib/format/number";
import { attempt } from "@/lib/actions/attempt";

const VAT_RATE = 15;

type ClientOption = { id: string; name: string };

type LineItemDraft = {
  item_id: string | null;
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
  catalogItems?: CreatedItem[];
  feePresets?: CreatedFeePreset[];
  initial?: InvoiceFormInitial;
  /** Whether this freelancer may put a VAT line on an invoice at all (KSA law). */
  vatEligibility: VatEligibility;
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
  // Halala precision at the boundary too — the totals must never see a third decimal
  // that the printed unit price cannot show.
  return isNaN(n) ? 0 : roundHalala(n);
}

export function InvoiceForm({
  locale,
  clients = [],
  catalogItems = [],
  feePresets = [],
  initial,
  vatEligibility,
}: Props) {
  const t = useTranslations("Invoices.form");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Line items — seed a single line from gig pre-fill when present.
  const [items, setItems] = useState<LineItemDraft[]>(() => {
    if (initial?.title && initial?.amount_sar != null) {
      return [
        {
          item_id: null,
          description: initial.title,
          quantity: "1",
          unit_price_sar: clampMoneyInput(String(initial.amount_sar)),
        },
      ];
    }
    return [];
  });

  const [fees, setFees] = useState<InvoiceFee[]>([]);
  const [vatOn, setVatOn] = useState(false);
  // Charging VAT unregistered is a KSA violation, and a tax invoice without the seller's
  // registration number is invalid. Ineligible → the switch is off and stays off.
  const vatAllowed = vatEligibility.eligible;
  const [clientId, setClientId] = useState<string>(initial?.client_id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate());

  const vatPct = vatOn && vatAllowed ? VAT_RATE : 0;

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`;
  const labelClass = `block text-sm font-medium text-rizq-ink mb-2 ${font}`;

  // Parsed items + totals preview (mirrors the DB trigger via computeInvoiceTotals).
  const parsedItems = items.map((item) => ({
    item_id: item.item_id,
    description: item.description,
    quantity: parseNum(item.quantity),
    unit_price_sar: parseNum(item.unit_price_sar),
    total_sar: lineItemTotal(parseNum(item.quantity), parseNum(item.unit_price_sar)),
  }));

  const totals = computeInvoiceTotals(parsedItems, fees, vatPct);

  function fmtMoney(n: number): string {
    return new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  }

  const currency = t("sar");

  // ── Item line handlers ─────────────────────────────────────────────────────
  function addItemFromCatalog(item: CreatedItem) {
    setItems((prev) => [
      ...prev,
      {
        item_id: item.id,
        description: item.name,
        // Clamp on the way in too: a catalog row saved before money entry was constrained
        // can still hold three decimals, and the field must not show a precision the
        // totals will not use.
        quantity: "1",
        unit_price_sar: clampMoneyInput(String(item.unit_price_sar)),
      },
    ]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: "quantity" | "unit_price_sar", value: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  // ── Fee handlers ───────────────────────────────────────────────────────────
  function addFee(fee: InvoiceFee) {
    setFees((prev) => [...prev, fee]);
  }

  function removeFee(idx: number) {
    setFees((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    // Defense-in-depth: ignore submit events that bubbled up from a nested or
    // portaled child form (the item / fee / client dialogs). Only this form's
    // own submit should create an invoice.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();

    if (!clientId) {
      setError(t("errors.clientRequired"));
      return;
    }

    const validItems = parsedItems.filter(
      (it) => it.description.trim() && it.quantity > 0 && it.unit_price_sar > 0
    );
    if (validItems.length === 0) {
      setError(t("errors.itemsRequired"));
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await attempt(() =>
        createInvoice({
          client_id: clientId,
          items: validItems,
          fees,
          vat_pct: vatPct,
          gig_id: initial?.gig_id,
          payment_method: paymentMethod as "bank_transfer" | "stc_pay" | "cash" | "other",
          payment_details: paymentDetails.trim() || undefined,
          due_date: dueDate,
        }),
      );
      if (!result) {
        // The request never came back — see lib/actions/attempt.
        setError(tCommon("saveUnconfirmed"));
        return;
      }

      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setShowUpgradeModal(true);
        } else {
          setError(t("errors.generic"));
        }
        return;
      }

      router.push(`/invoices/${result.invoice_id}` as `/invoices/${string}`);
      router.refresh();
    });
  }

  const paymentMethodLabels = isAr ? PAYMENT_METHOD_LABELS_AR : PAYMENT_METHOD_LABELS_EN;

  return (
    <>
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
        reason="invoices"
      />
      <form
        onSubmit={handleSubmit}
        dir={dir}
        className={`card-wahaj p-7 sm:p-10 space-y-7 animate-fade-in ${font}`}
        noValidate
      >
        <div>
          <p className="eyebrow mb-1 text-rizq-green">{t("addTitle")}</p>
        </div>

        {/* Client (required) */}
        <div>
          <label className={labelClass}>
            {t("clientLabel")} <span className="text-[var(--over)]">*</span>
          </label>
          <ClientPicker
            value={clientId}
            onChange={setClientId}
            clients={clients}
            locale={locale}
            noneLabel={t("clientPlaceholder")}
          />
        </div>

        {/* Items (required, from catalog) */}
        <div>
          <label className={labelClass}>
            {t("itemsLabel")} <span className="text-[var(--over)]">*</span>
          </label>

          {items.length > 0 && (
            <div className="mb-3 space-y-2">
              {items.map((item, idx) => {
                const lineTotal = lineItemTotal(
                  parseNum(item.quantity),
                  parseNum(item.unit_price_sar)
                );
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-rizq-gold/25 bg-[var(--panel)] p-3 sm:p-4"
                    dir={dir}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-medium text-rizq-ink leading-snug ${font}`}>
                        {item.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="shrink-0 p-1.5 text-rizq-ink-soft/50 hover:text-[var(--over)] transition-colors"
                        aria-label={t("removeItem")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      {/* Qty */}
                      <div>
                        <label className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
                          {t("qtyLabel")}
                        </label>
                        <input
                          type="number"
                          aria-label={t("qtyLabel")}
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, "quantity", clampMoneyInput(e.target.value))
                          }
                          onBlur={(e) => {
                            const n = parseFloat(e.target.value);
                            if (Number.isFinite(n)) {
                              updateItem(idx, "quantity", String(roundHalala(n)));
                            }
                          }}
                          className="w-20 rounded-lg border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-2 text-base text-rizq-ink focus:outline-none focus:border-rizq-green focus:bg-rizq-cream transition-colors text-center tabular font-sans"
                          dir="ltr"
                        />
                      </div>
                      {/* Unit price */}
                      <div>
                        <label className={`block text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>
                          {t("unitPriceLabel")}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            aria-label={t("unitPriceLabel")}
                            inputMode="decimal"
                            min="0"
                            // Halala precision: what is printed must be what was multiplied.
                            step="0.01"
                            value={item.unit_price_sar}
                            onChange={(e) =>
                              updateItem(idx, "unit_price_sar", clampMoneyInput(e.target.value))
                            }
                            onBlur={(e) => {
                              const n = parseFloat(e.target.value);
                              if (Number.isFinite(n)) {
                                updateItem(idx, "unit_price_sar", String(roundHalala(n)));
                              }
                            }}
                            placeholder="0"
                            className="w-32 rounded-lg border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-2 pe-10 text-base text-rizq-ink focus:outline-none focus:border-rizq-green focus:bg-rizq-cream transition-colors tabular font-sans"
                            dir="ltr"
                          />
                          <span className={`pointer-events-none absolute ${isAr ? "left-2.5" : "right-2.5"} top-1/2 -translate-y-1/2 text-xs text-rizq-ink-soft/60 ${font}`}>
                            {currency}
                          </span>
                        </div>
                      </div>
                      {/* Line total */}
                      <div className="ms-auto text-end">
                        <p className={`text-xs text-rizq-ink-soft/70 mb-1 ${font}`}>{t("lineTotalLabel")}</p>
                        <p className="tabular font-sans text-base font-semibold text-rizq-ink">
                          {fmtMoney(lineTotal)}{" "}
                          <span className={`text-xs font-normal text-rizq-ink-soft/60 ${font}`}>
                            {currency}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Catalog picker (+ Add item popped dialog for unlisted) */}
          <ItemPicker locale={locale} items={catalogItems} onPick={addItemFromCatalog} />
          <p className={`mt-1.5 text-xs text-rizq-ink-soft/60 ${font}`}>{t("itemsHint")}</p>
        </div>

        {/* Tax & Fees */}
        <div className="rounded-2xl border border-rizq-gold/20 bg-rizq-cream/40 p-5 space-y-5">
          <p className={`text-sm font-semibold text-rizq-ink ${font}`}>{t("taxAndFeesLabel")}</p>

          {/* VAT toggle — fixed 15%, gated on VAT registration */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("vatToggleLabel")}</p>
              <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>{t("vatToggleHint")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={vatOn && vatAllowed}
              aria-label={t("vatToggleLabel")}
              disabled={!vatAllowed}
              aria-describedby={vatAllowed ? undefined : "vat-blocked-reason"}
              onClick={() => setVatOn((v) => !v)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream disabled:cursor-not-allowed disabled:opacity-50 ${
                vatOn && vatAllowed ? "bg-rizq-green" : "bg-rizq-ink/15"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                  vatOn && vatAllowed
                    ? isAr
                      ? "-translate-x-6"
                      : "translate-x-6"
                    : isAr
                    ? "-translate-x-1"
                    : "translate-x-1"
                }`}
              >
                {vatOn && vatAllowed && (
                  <Check size={12} className="text-rizq-green" strokeWidth={3} />
                )}
              </span>
            </button>
          </div>

          {/* Why VAT is unavailable + where to fix it */}
          {!vatAllowed && (
            <p
              id="vat-blocked-reason"
              className={`-mt-2 text-xs text-rizq-ink-soft ${font}`}
            >
              {vatEligibility.reason === "missing_number"
                ? t("vatBlockedMissingNumber")
                : t("vatBlockedNotRegistered")}{" "}
              <Link
                href="/settings/profile"
                className="text-rizq-green underline underline-offset-2 hover:text-rizq-green-dark"
              >
                {t("vatBlockedCta")}
              </Link>
            </p>
          )}

          {/* Fees */}
          <div>
            <p className={`text-sm font-medium text-rizq-ink mb-2 ${font}`}>{t("feesLabel")}</p>

            {fees.length > 0 && (
              <div className="mb-3 space-y-2">
                {fees.map((fee, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/25 bg-[var(--panel)] px-3.5 py-2.5"
                    dir={dir}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium text-rizq-ink truncate ${font}`}>
                        {fee.name}
                        {fee.fee_type === "percentage" && (
                          <span className={`ms-1.5 text-xs font-normal text-rizq-ink-soft/60 ${font}`}>
                            ({fmtRate(fee.rate ?? 0, locale)}%)
                          </span>
                        )}
                      </p>
                      {fee.category && (
                        <p className={`text-xs text-rizq-ink-soft/60 truncate ${font}`}>{fee.category}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular font-sans text-sm font-medium text-rizq-ink">
                        {fmtMoney(resolveFeeAmount(fee, totals.subtotal_sar))}{" "}
                        <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{currency}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFee(idx)}
                        className="p-1.5 text-rizq-ink-soft/50 hover:text-[var(--over)] transition-colors"
                        aria-label={t("removeFee")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <FeePicker locale={locale} presets={feePresets} onPick={addFee} />
          </div>
        </div>

        {/* Totals preview */}
        {(totals.subtotal_sar > 0 || totals.fees_sar > 0) && (
          <div
            dir={dir}
            className={`rounded-2xl border border-rizq-gold/20 bg-[var(--panel)] p-5 space-y-2 ${font}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-rizq-ink-soft">{t("subtotalLabel")}</span>
              <span className="tabular font-sans text-sm font-medium text-rizq-ink">
                {fmtMoney(totals.subtotal_sar)}{" "}
                <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{currency}</span>
              </span>
            </div>
            {totals.fees_sar > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-rizq-ink-soft">{t("feesLabel")}</span>
                <span className="tabular font-sans text-sm font-medium text-rizq-ink">
                  {fmtMoney(totals.fees_sar)}{" "}
                  <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{currency}</span>
                </span>
              </div>
            )}
            {vatPct > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-rizq-ink-soft">
                  {t("vatLabel")} ({fmtRate(vatPct, locale)}%)
                </span>
                <span className="tabular font-sans text-sm font-medium text-rizq-ink">
                  {fmtMoney(totals.vat_sar)}{" "}
                  <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{currency}</span>
                </span>
              </div>
            )}
            <div className="border-t border-rizq-gold/20 pt-2 flex items-center justify-between">
              <span className={`text-base font-semibold text-rizq-ink ${font}`}>{t("totalLabel")}</span>
              <span className="tabular font-sans text-xl font-bold text-rizq-green">
                {fmtMoney(totals.total_sar)}{" "}
                <span className={`text-sm font-normal text-rizq-ink-soft ${font}`}>{currency}</span>
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
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
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
            aria-label={t("dueDateLabel")}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${inputClass} font-sans`}
            dir="ltr"
          />
        </div>

        {error && (
          <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
            {error}
          </p>
        )}

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
    </>
  );
}
