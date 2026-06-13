"use client";

/**
 * InvoiceDetailActions — client island for invoice detail page. Phase-4 task P4.4.
 * P4.5: adds Share (ShareInvoiceModal) + Print (PrintButton) actions.
 * Mirrors GigDetailActions: status transitions, delete with confirm, useTransition.
 */

import { useState, useTransition } from "react";
import { Loader2, Trash2, CheckCircle, AlertCircle, Send, Eye, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { markInvoiceStatus } from "@/app/actions/invoices/markInvoiceStatus";
import { deleteInvoice } from "@/app/actions/invoices/deleteInvoice";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { PrintButton } from "@/components/proposals/PrintButton";

type Props = {
  locale: "ar" | "en";
  invoiceId: string;
  status: string;
  /** Current public_share state — so modal initialises correctly */
  publicShare: boolean;
  /** Current share_token — may be null if never shared */
  shareToken: string | null;
};

// Allowed transitions (mirrors markInvoiceStatus server action)
const TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["viewed", "paid", "overdue", "cancelled"],
  viewed: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export function InvoiceDetailActions({
  locale,
  invoiceId,
  status,
  publicShare,
  shareToken,
}: Props) {
  const t = useTranslations("Invoices.detail");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const router = useRouter();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [isMarkingSent, startMarkSentTransition] = useTransition();
  const [isMarkingViewed, startMarkViewedTransition] = useTransition();
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();
  const [isMarkingOverdue, startMarkOverdueTransition] = useTransition();
  const [isMarkingCancelled, startMarkCancelledTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const allowed = TRANSITIONS[status] ?? [];

  function handleMarkSent() {
    startMarkSentTransition(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: "sent" });
      if (result.ok) router.refresh();
    });
  }

  function handleMarkViewed() {
    startMarkViewedTransition(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: "viewed" });
      if (result.ok) router.refresh();
    });
  }

  function handleMarkPaid() {
    startMarkPaidTransition(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: "paid" });
      if (result.ok) router.refresh();
    });
  }

  function handleMarkOverdue() {
    startMarkOverdueTransition(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: "overdue" });
      if (result.ok) router.refresh();
    });
  }

  function handleMarkCancelled() {
    startMarkCancelledTransition(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: "cancelled" });
      if (result.ok) router.refresh();
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteInvoice({ invoice_id: invoiceId });
      if (result.ok) {
        router.push("/invoices" as "/invoices");
      }
    });
  }

  // Note: we no longer early-return when allowed is empty — Share + Print
  // should always be available regardless of status.

  return (
    <div className="space-y-4">
      <div dir={dir} className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 ${font}`}>
        <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-4">
          {isAr ? "الإجراءات" : "Actions"}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Mark Sent */}
          {allowed.includes("sent") && (
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={isMarkingSent}
              className={`inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isMarkingSent ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {t("markSent")}
            </button>
          )}

          {/* Mark Viewed */}
          {allowed.includes("viewed") && (
            <button
              type="button"
              onClick={handleMarkViewed}
              disabled={isMarkingViewed}
              className={`inline-flex items-center gap-2 rounded-full border border-blue-300/50 text-blue-700 px-5 py-2.5 text-sm font-medium hover:bg-blue-50 transition-all disabled:opacity-70 ${font}`}
            >
              {isMarkingViewed ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Eye size={14} />
              )}
              {t("markViewed")}
            </button>
          )}

          {/* Mark Paid */}
          {allowed.includes("paid") && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className={`inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isMarkingPaid ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              {t("markPaid")}
            </button>
          )}

          {/* Mark Overdue */}
          {allowed.includes("overdue") && (
            <button
              type="button"
              onClick={handleMarkOverdue}
              disabled={isMarkingOverdue}
              className={`inline-flex items-center gap-2 rounded-full border border-red-300/50 text-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-70 ${font}`}
            >
              {isMarkingOverdue ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <AlertCircle size={14} />
              )}
              {t("markOverdue")}
            </button>
          )}

          {/* Mark Cancelled */}
          {allowed.includes("cancelled") && (
            <button
              type="button"
              onClick={handleMarkCancelled}
              disabled={isMarkingCancelled}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-ink/20 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:bg-rizq-ink/5 transition-all disabled:opacity-70 ${font}`}
            >
              {isMarkingCancelled ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {t("markCancelled")}
            </button>
          )}

          {/* Delete */}
          {status !== "paid" && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className={`inline-flex items-center gap-2 rounded-full border border-red-300/50 text-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-50 transition-all ${font}`}
            >
              <Trash2 size={14} />
              {t("delete")}
            </button>
          )}
        </div>

        {/* ── P4.5: Share + Print ── */}
        <div className="mt-4 pt-4 border-t border-rizq-gold/15 flex flex-wrap gap-3">
          {/* Share invoice */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-5 py-2.5 text-sm font-medium hover:bg-rizq-green/10 transition-all ${font}`}
          >
            <Share2 size={14} />
            {t("share")}
          </button>

          {/* Print to PDF */}
          <PrintButton label={t("print")} locale={locale} />
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && (
        <ShareInvoiceModal
          locale={locale}
          invoiceId={invoiceId}
          initialShared={publicShare}
          initialToken={shareToken}
          status={status}
          onClose={() => {
            setShowShareModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div
          dir={dir}
          className={`rounded-2xl border border-red-200 bg-red-50/60 p-5 space-y-3 animate-fade-in ${font}`}
        >
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>
            {t("deleteConfirm")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("deleteConfirmBtn")
              )}
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
    </div>
  );
}
