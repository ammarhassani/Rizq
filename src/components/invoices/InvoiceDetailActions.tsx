"use client";

/**
 * InvoiceDetailActions — client island for invoice detail page. Phase-4 task P4.4.
 * P4.5: adds Share (ShareInvoiceModal) + Print (PrintButton) actions.
 * P4.6: adds AI description + AI payment reminder buttons (M6.4).
 * Mirrors GigDetailActions: status transitions, delete with confirm, useTransition.
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, CheckCircle, AlertCircle, Send, Eye, Share2, Sparkles, Copy, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { markInvoiceStatus } from "@/app/actions/invoices/markInvoiceStatus";
import { deleteInvoice } from "@/app/actions/invoices/deleteInvoice";
import { generateInvoiceDescriptionAction } from "@/app/actions/invoices/aiActions";
import { generatePaymentReminderAction } from "@/app/actions/invoices/aiActions";
import { ShareInvoiceModal } from "@/components/invoices/ShareInvoiceModal";
import { sendInvoiceEmail } from "@/app/actions/invoices/sendInvoiceEmail";
import { PrintButton } from "@/components/proposals/PrintButton";

type Props = {
  locale: "ar" | "en";
  invoiceId: string;
  status: string;
  /** Current public_share state — so modal initialises correctly */
  publicShare: boolean;
  /** Current share_token — may be null if never shared */
  shareToken: string | null;
  /** Pass true when the invoice looks overdue (sent/viewed/overdue) — UI hint only; action re-checks the ≥7-day gate */
  looksOverdue?: boolean;
  /** When opened in a guided project context, a successful status change returns
   *  here (the project pane) instead of refreshing in place (feature 005, US2). */
  returnTo?: string;
  /** Whether transactional email is wired up in this runtime (RESEND_* set). */
  emailConfigured?: boolean;
  /** Whether the attached client actually has an email address to send to. */
  clientHasEmail?: boolean;
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
  looksOverdue = false,
  returnTo,
  emailConfigured = false,
  clientHasEmail = false,
}: Props) {
  const t = useTranslations("Invoices.detail");
  const tAi = useTranslations("Invoices.ai");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const router = useRouter();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Email delivery state
  const [isEmailing, startEmailTransition] = useTransition();
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSendEmail = () => {
    setEmailError(null);
    setEmailSentTo(null);
    startEmailTransition(async () => {
      const res = await sendInvoiceEmail({ invoice_id: invoiceId, locale });
      if (res.ok) {
        setEmailSentTo(res.sent_to);
        router.refresh(); // status may have moved draft → sent
        return;
      }
      setEmailError(
        res.code === "no_client_email"
          ? isAr
            ? "لا يوجد بريد إلكتروني لهذا العميل."
            : "This client has no email address."
          : res.code === "not_configured"
            ? isAr
              ? "إرسال البريد غير مُفعّل."
              : "Email sending isn't configured."
            : isAr
              ? "تعذّر إرسال الفاتورة. حاول مرة أخرى."
              : "Couldn't send the invoice. Please try again.",
      );
    });
  };

  // AI description state
  const [isGeneratingDescription, startGenerateDescTransition] = useTransition();
  const [descriptionDraft, setDescriptionDraft] = useState<{ ar: string; en: string } | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [descCopied, setDescCopied] = useState(false);

  // AI reminder state
  const [isGeneratingReminder, startGenerateReminderTransition] = useTransition();
  const [reminderDraft, setReminderDraft] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  const [isMarkingSent, startMarkSentTransition] = useTransition();
  const [isMarkingViewed, startMarkViewedTransition] = useTransition();
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();
  const [isMarkingOverdue, startMarkOverdueTransition] = useTransition();
  const [isMarkingCancelled, startMarkCancelledTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const allowed = TRANSITIONS[status] ?? [];

  const STATUS_LABEL_AR: Record<string, string> = {
    draft: "مسودة", sent: "مُرسَلة", viewed: "مُطَّلَع عليها",
    paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة",
  };
  const STATUS_LABEL_EN: Record<string, string> = {
    draft: "Draft", sent: "Sent", viewed: "Viewed",
    paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
  };

  // Reverse a status change for the Undo toast. Uses allow_reverse since the
  // backward step is rarely a legal forward transition.
  function revertStatus(prevStatus: string, start: (cb: () => void) => void) {
    start(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: prevStatus, allow_reverse: true });
      if (result.ok) router.refresh();
      else toast.error(t("couldnTUndo"));
    });
  }

  // Apply a forward status change instantly + offer Undo back to `status`.
  function applyStatus(next: string, start: (cb: () => void) => void) {
    const prev = status;
    start(async () => {
      const result = await markInvoiceStatus({ invoice_id: invoiceId, status: next });
      if (result.ok) {
        // Guided continuity: return to the project pane on success; else refresh in place.
        if (returnTo) router.push(returnTo as `/projects/${string}`);
        else router.refresh();
        const label = isAr ? STATUS_LABEL_AR[next] : STATUS_LABEL_EN[next];
        toast.success(isAr ? `الحالة: ${label} · يمكنك التراجع` : `Marked ${label} · Undo`, {
          duration: 7000,
          action: { label: t("undo"), onClick: () => revertStatus(prev, start) },
        });
      } else {
        toast.error(t("couldnTUpdateStatus"));
      }
    });
  }

  function handleMarkSent() { applyStatus("sent", startMarkSentTransition); }
  function handleMarkViewed() { applyStatus("viewed", startMarkViewedTransition); }
  function handleMarkPaid() { applyStatus("paid", startMarkPaidTransition); }
  function handleMarkOverdue() { applyStatus("overdue", startMarkOverdueTransition); }
  function handleMarkCancelled() { applyStatus("cancelled", startMarkCancelledTransition); }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteInvoice({ invoice_id: invoiceId });
      if (result.ok) {
        // Hard delete — irreversible, so a plain confirmation toast (no Undo).
        toast.success(t("deleted"));
        router.push("/invoices" as "/invoices");
        router.refresh();
      } else {
        toast.error(t("couldnTDelete"));
      }
    });
  }

  // AI handlers
  function handleGenerateDescription() {
    setDescriptionError(null);
    setDescriptionDraft(null);
    startGenerateDescTransition(async () => {
      const result = await generateInvoiceDescriptionAction({ invoice_id: invoiceId });
      if (result.ok) {
        setDescriptionDraft({ ar: result.ar, en: result.en });
        router.refresh();
      } else {
        setDescriptionError(tAi("aiError"));
      }
    });
  }

  function handleGenerateReminder() {
    setReminderError(null);
    setReminderDraft(null);
    startGenerateReminderTransition(async () => {
      const result = await generatePaymentReminderAction({ invoice_id: invoiceId });
      if (result.ok) {
        setReminderDraft(result.draft);
      } else if (result.code === "not_overdue") {
        setReminderError(tAi("reminderNotOverdue"));
      } else {
        setReminderError(tAi("aiError"));
      }
    });
  }

  function copyToClipboard(text: string, onCopied: (v: boolean) => void) {
    void navigator.clipboard.writeText(text).then(() => {
      onCopied(true);
      setTimeout(() => onCopied(false), 2000);
    });
  }

  // Note: we no longer early-return when allowed is empty — Share + Print
  // should always be available regardless of status.

  return (
    <div className="space-y-4">
      <div dir={dir} className={`card-wahaj-sm p-5 ${font}`}>
        <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-4">
          {t("actions")}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Mark Sent */}
          {allowed.includes("sent") && (
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={isMarkingSent}
              className={`inline-flex items-center gap-2 rounded-full aurora-fill px-5 py-2.5 text-sm font-medium hover:brightness-105 transition-colors disabled:opacity-70 ${font}`}
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
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--acc-line)] text-[var(--acc-tint)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--acc-soft)] transition-all disabled:opacity-70 ${font}`}
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
              className={`inline-flex items-center gap-2 rounded-full aurora-fill px-5 py-2.5 text-sm font-medium hover:brightness-105 transition-colors disabled:opacity-70 ${font}`}
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
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--over-line)] text-[var(--over)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--over-soft)] transition-all disabled:opacity-70 ${font}`}
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
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--over-line)] text-[var(--over)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--over-soft)] transition-all ${font}`}
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

          {/* Email to client — only offered when it can actually work: email must
              be configured in this runtime AND the client must have an address.
              Offering a button that silently does nothing would be a false
              affordance (Principle I). */}
          {emailConfigured && clientHasEmail && (
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isEmailing}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-5 py-2.5 text-sm font-medium hover:bg-rizq-green/10 transition-all disabled:opacity-70 ${font}`}
            >
              {isEmailing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {t("emailClient")}
            </button>
          )}

          {/* Print to PDF */}
          <PrintButton label={t("print")} locale={locale} />
        </div>

        {(emailSentTo || emailError) && (
          <p
            role={emailError ? "alert" : "status"}
            className={`mt-2 text-xs ${emailError ? "text-[var(--over)]" : "text-[var(--acc)]"} ${font}`}
          >
            {emailError ?? (isAr ? `أُرسلت إلى ${emailSentTo}` : `Sent to ${emailSentTo}`)}
          </p>
        )}

        {/* ── P4.6: AI Tools ── */}
        <div className="mt-4 pt-4 border-t border-rizq-gold/15">
          <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-3">
            {tAi("sectionTitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            {/* AI Description */}
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={isGeneratingDescription}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/80 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-70 ${font}`}
            >
              {isGeneratingDescription ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {isGeneratingDescription ? tAi("generatingDescription") : tAi("generateDescription")}
            </button>

            {/* AI Payment Reminder — show when invoice looks overdue */}
            {looksOverdue && (
              <button
                type="button"
                onClick={handleGenerateReminder}
                disabled={isGeneratingReminder}
                className={`inline-flex items-center gap-2 rounded-full border border-[var(--warn-line)] text-[var(--warn)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--warn-soft)] transition-all disabled:opacity-70 ${font}`}
              >
                {isGeneratingReminder ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {isGeneratingReminder ? tAi("generatingReminder") : tAi("generateReminder")}
              </button>
            )}
          </div>

          {/* Description draft output */}
          {descriptionError && (
            <p className={`mt-3 text-sm text-[var(--over)] ${font}`}>{descriptionError}</p>
          )}
          {descriptionDraft && (
            <div className={`mt-3 rounded-2xl border border-rizq-gold/25 bg-[var(--raised)] p-4 space-y-2 ${font}`} dir={dir}>
              <p className="text-xs font-medium text-rizq-green/80 tracking-wide">
                {tAi("descriptionLabel")}
              </p>
              <p className="text-sm text-rizq-ink leading-relaxed">{isAr ? descriptionDraft.ar : descriptionDraft.en}</p>
              {isAr && descriptionDraft.en && (
                <p className="text-xs text-rizq-ink-soft/70 font-sans" dir="ltr">{descriptionDraft.en}</p>
              )}
              <button
                type="button"
                onClick={() => copyToClipboard(isAr ? descriptionDraft.ar : descriptionDraft.en, setDescCopied)}
                className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream px-3 py-1.5 text-xs font-medium text-rizq-ink-soft hover:text-rizq-green hover:border-rizq-green/40 transition-all ${font}`}
              >
                <Copy size={12} />
                {descCopied ? tAi("copied") : tAi("copy")}
              </button>
            </div>
          )}

          {/* Reminder draft output */}
          {reminderError && (
            <p className={`mt-3 text-sm text-[var(--warn)] ${font}`}>{reminderError}</p>
          )}
          {reminderDraft && (
            <div className={`mt-3 rounded-2xl border border-[var(--warn-line)] bg-[var(--warn-soft)] p-4 space-y-2 ${font}`} dir={dir}>
              <p className="text-xs font-medium text-[var(--warn)]/80 tracking-wide">
                {tAi("draftLabel")}
              </p>
              <textarea
                readOnly
                value={reminderDraft}
                rows={4}
                className={`w-full rounded-xl border border-[var(--warn-line)] bg-[var(--raised)] px-3 py-2.5 text-sm text-rizq-ink resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${font}`}
                dir={dir}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(reminderDraft, setReminderCopied)}
                className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--warn-line)] bg-[var(--raised)] px-3 py-1.5 text-xs font-medium text-[var(--warn)] hover:bg-[var(--warn-soft)] transition-all ${font}`}
              >
                <Copy size={12} />
                {reminderCopied ? tAi("copied") : tAi("copy")}
              </button>
            </div>
          )}
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
          className={`rounded-2xl border border-[var(--over-line)] bg-[var(--over-soft)] p-5 space-y-3 animate-fade-in ${font}`}
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
