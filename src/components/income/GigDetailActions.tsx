"use client";

/**
 * GigDetailActions — client island for gig detail page. Phase-3 task 3.7.
 * P4.7: added Generate Invoice CTA + linked-invoice chip.
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Edit2, Trash2, CheckCircle, AlertCircle, FileText, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { markGigStatus, deleteGig } from "@/app/actions/gigs/gigs";
import { createInvoiceFromGig } from "@/app/actions/invoices/createInvoiceFromGig";
import { track } from "@/lib/analytics/track";
import { GigForm } from "./GigForm";
import type { GigRow } from "./GigCard";

type ClientOption = { id: string; name: string };

/** Minimal invoice info for the linked-invoice chip */
export type LinkedInvoice = {
  id: string;
  invoice_number: string;
  status: string;
};

type Props = {
  locale: "ar" | "en";
  gig: GigRow & {
    category?: string | null;
    description?: string | null;
    payment_method?: string | null;
    payment_notes?: string | null;
  };
  clients?: ClientOption[];
  /** If the gig already has a linked invoice, pass it here. */
  linkedInvoice?: LinkedInvoice | null;
};

const INVOICE_STATUS_AR: Record<string, string> = {
  draft: "مسودة", sent: "مُرسَلة", viewed: "مُطَّلَع عليها",
  paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة",
};
const INVOICE_STATUS_EN: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

export function GigDetailActions({ locale, gig, clients = [], linkedInvoice = null }: Props) {
  const t = useTranslations("Income.detail");
  const tInv = useTranslations("Invoices.cta");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const [isMarkingPaid, startMarkPaidTransition] = useTransition();
  const [isMarkingOverdue, startMarkOverdueTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isGeneratingInvoice, startInvoiceTransition] = useTransition();

  /** Show the "Generate invoice" button only when gig is delivered/paid AND no invoice yet */
  const canGenerateInvoice =
    !linkedInvoice &&
    (gig.status === "delivered" || gig.status === "paid");

  function handleGenerateInvoice() {
    setInvoiceError(null);
    startInvoiceTransition(async () => {
      const result = await createInvoiceFromGig({ gig_id: gig.id });
      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setInvoiceError(t("freeInvoiceLimitReachedUpgrade"));
        } else {
          setInvoiceError(t("couldCreateInvoiceTryAgain"));
        }
        return;
      }
      track("invoice_generated_from_gig", { locale, gig_id: gig.id, invoice_id: result.invoice_id });
      router.push(`/invoices/${result.invoice_id}` as `/invoices/${string}`);
    });
  }

  // Reverse a status change (powers Undo). Silent — no nested toast.
  function revertStatus(prevStatus: string) {
    startMarkPaidTransition(async () => {
      const result = await markGigStatus({ id: gig.id, status: prevStatus });
      if (result.ok) router.refresh();
      else toast.error(t("couldnTUndo"));
    });
  }

  function handleMarkPaid() {
    const prev = gig.status;
    startMarkPaidTransition(async () => {
      const result = await markGigStatus({ id: gig.id, status: "paid" });
      if (result.ok) {
        track("gig_marked_paid", { locale });
        router.refresh();
        toast.success(t("statusPaidUndo"), {
          duration: 7000,
          action: { label: t("undo"), onClick: () => revertStatus(prev) },
        });
      } else {
        toast.error(t("couldnTUpdateStatus"));
      }
    });
  }

  function handleMarkOverdue() {
    const prev = gig.status;
    startMarkOverdueTransition(async () => {
      const result = await markGigStatus({ id: gig.id, status: "overdue" });
      if (result.ok) {
        track("gig_marked_overdue", { locale });
        router.refresh();
        toast.success(t("statusOverdueUndo"), {
          duration: 7000,
          action: { label: t("undo"), onClick: () => revertStatus(prev) },
        });
      } else {
        toast.error(t("couldnTUpdateStatus"));
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteGig({ id: gig.id });
      if (result.ok) {
        track("gig_deleted", { locale });
        // Hard delete — irreversible, so a plain confirmation toast (no Undo).
        toast.success(t("deleted"));
        router.push("/income" as "/income");
        router.refresh();
      } else {
        toast.error(t("couldnTDelete"));
      }
    });
  }

  if (showEdit) {
    return (
      <GigForm
        locale={locale}
        mode="edit"
        initialData={{
          id: gig.id,
          title: gig.title,
          amount_sar: gig.amount_sar,
          client_id: gig.client_id,
          status: gig.status,
          delivery_date: gig.delivery_date,
          category: gig.category,
          payment_method: gig.payment_method,
          payment_notes: gig.payment_notes,
        }}
        clients={clients}
        onSuccess={() => { setShowEdit(false); router.refresh(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Linked invoice chip — shown when gig already has an invoice */}
      {linkedInvoice && (
        <div dir={dir} className={`rounded-2xl border border-rizq-green/20 bg-rizq-green/5 p-4 ${font}`}>
          <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-2">
            {t("linkedInvoice")}
          </p>
          <Link
            href={`/invoices/${linkedInvoice.id}` as `/invoices/${string}`}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/30 bg-[var(--raised)] text-rizq-green px-4 py-2 text-sm font-medium hover:bg-rizq-green/10 transition-all ${font}`}
          >
            <FileText size={14} />
            <span className="tabular">{linkedInvoice.invoice_number}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rizq-green/10 text-rizq-green ${font}`}>
              {isAr
                ? INVOICE_STATUS_AR[linkedInvoice.status] ?? linkedInvoice.status
                : INVOICE_STATUS_EN[linkedInvoice.status] ?? linkedInvoice.status}
            </span>
            <ExternalLink size={12} className="opacity-60" />
          </Link>
        </div>
      )}

      <div dir={dir} className={`card-wahaj-sm p-5 ${font}`}>
        <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-4">
          {t("actions")}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Edit */}
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
          >
            <Edit2 size={14} />
            {t("edit")}
          </button>

          {/* Generate invoice — only when delivered/paid + no existing invoice */}
          {canGenerateInvoice && (
            <button
              type="button"
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
            >
              {isGeneratingInvoice ? (
                <><Loader2 size={14} className="animate-spin" /> {tInv("generating")}</>
              ) : (
                <><FileText size={14} /> {tInv("generateFromGig")}</>
              )}
            </button>
          )}

          {/* Mark Paid */}
          {gig.status !== "paid" && gig.status !== "cancelled" && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className={`inline-flex items-center gap-2 rounded-full aurora-fill px-5 py-2.5 text-sm font-medium hover:brightness-105 transition-colors disabled:opacity-70 ${font}`}
            >
              {isMarkingPaid ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {t("markPaid")}
            </button>
          )}

          {/* Mark Overdue */}
          {!["paid", "cancelled", "overdue"].includes(gig.status) && (
            <button
              type="button"
              onClick={handleMarkOverdue}
              disabled={isMarkingOverdue}
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--over-line)] text-[var(--over)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--over-soft)] transition-all disabled:opacity-70 ${font}`}
            >
              {isMarkingOverdue ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
              {t("markOverdue")}
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-[var(--over-line)] text-[var(--over)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--over-soft)] transition-all ${font}`}
          >
            <Trash2 size={14} />
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div dir={dir} className={`rounded-2xl border border-[var(--over-line)] bg-[var(--over-soft)] p-5 space-y-3 animate-fade-in ${font}`}>
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("deleteConfirm")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isDeleting ? <><Loader2 size={14} className="animate-spin" />{t("deleting")}</> : t("deleteConfirmBtn")}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Invoice generation error */}
      {invoiceError && (
        <p role="alert" className={`text-sm text-[var(--over)] px-1 ${font}`}>
          {invoiceError}
        </p>
      )}
    </div>
  );
}
