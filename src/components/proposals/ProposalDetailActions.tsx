"use client";

/**
 * ProposalDetailActions — Phase-2 task 2.9 (frontend, part 2)
 *
 * Client island rendered on the proposal detail page.
 * Provides: Finalize, Share (opens ShareModal), Mark accepted/declined.
 * After each mutation, calls router.refresh() so the server data re-renders.
 */

import { useState, useTransition } from "react";
import { Loader2, Share2, CheckCircle, XCircle, BookmarkPlus, PlusCircle, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { finalizeProposal } from "@/app/actions/proposals/finalizeProposal";
import { markStatus } from "@/app/actions/proposals/markStatus";
import { saveTemplateFromProposal } from "@/app/actions/proposals/templates";
import { createProjectFromProposal } from "@/app/actions/projects/createProjectFromProposal";
import { createInvoiceFromProposal } from "@/app/actions/invoices/createInvoiceFromProposal";
import { track } from "@/lib/analytics/track";
import { ShareModal } from "./ShareModal";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  locale: "ar" | "en";
  proposalId: string;
  status: string;
  publicShare: boolean;
  shareToken: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalDetailActions({
  locale,
  proposalId,
  status,
  publicShare,
  shareToken,
}: Props) {
  const t = useTranslations("Proposals.detail");
  const tTemplates = useTranslations("Proposals.templates");
  const tInv = useTranslations("Invoices.cta");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Modal state
  const [showShare, setShowShare] = useState(false);

  // Decline flow
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Template save flow
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaved, setTemplateSaved] = useState(false);

  // Create-gig CTA state
  const [createGigError, setCreateGigError] = useState<string | null>(null);

  // Create-invoice CTA state
  const [createInvoiceError, setCreateInvoiceError] = useState<string | null>(null);

  // Transitions
  const [isFinalizing, startFinalizeTransition] = useTransition();
  const [isMarkingStatus, startMarkStatusTransition] = useTransition();
  const [isSavingTemplate, startSaveTemplateTransition] = useTransition();
  const [isCreatingGig, startCreateGigTransition] = useTransition();
  const [isCreatingInvoice, startCreateInvoiceTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleFinalize() {
    startFinalizeTransition(async () => {
      const result = await finalizeProposal({ proposal_id: proposalId });
      if (result.ok) {
        track("proposal_finalized", { locale, proposal_id: proposalId });
        router.refresh();
      }
    });
  }

  function handleMarkAccepted() {
    startMarkStatusTransition(async () => {
      const result = await markStatus({ proposal_id: proposalId, status: "accepted" });
      if (result.ok) {
        track("proposal_status_changed", {
          locale,
          proposal_id: proposalId,
          status: "accepted",
        });
        router.refresh();
      }
    });
  }

  function handleMarkDeclined() {
    if (!showDeclineReason) {
      setShowDeclineReason(true);
      return;
    }
    startMarkStatusTransition(async () => {
      const result = await markStatus({
        proposal_id: proposalId,
        status: "declined",
        reason: declineReason.trim() || undefined,
      });
      if (result.ok) {
        track("proposal_status_changed", {
          locale,
          proposal_id: proposalId,
          status: "declined",
        });
        setShowDeclineReason(false);
        setDeclineReason("");
        router.refresh();
      }
    });
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    startSaveTemplateTransition(async () => {
      const result = await saveTemplateFromProposal({
        proposal_id: proposalId,
        name_ar: templateName.trim(),
        name_en: templateName.trim(),
      });
      if (result.ok) {
        track("proposal_template_saved", { locale, proposal_id: proposalId });
        setTemplateSaved(true);
        setShowTemplateSave(false);
        setTemplateName("");
      }
    });
  }

  function handleCreateGig() {
    setCreateGigError(null);
    startCreateGigTransition(async () => {
      const result = await createProjectFromProposal({ proposal_id: proposalId });
      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setCreateGigError(isAr ? "وصلت للحد المجاني للمشاريع. ترقَّ للاحترافي." : "Free project limit reached. Upgrade to Pro.");
        } else {
          setCreateGigError(isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again.");
        }
        return;
      }
      track("project_created_from_proposal", {
        locale,
        proposal_id: proposalId,
        project_id: result.project_id,
        gig_id: result.gig_id,
      });
      // next-intl's localized router prepends the active locale — pass the path UNPREFIXED.
      router.push(`/projects/${result.project_id}` as `/projects/${string}`);
    });
  }

  function handleCreateInvoice() {
    setCreateInvoiceError(null);
    startCreateInvoiceTransition(async () => {
      const result = await createInvoiceFromProposal({ proposal_id: proposalId });
      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setCreateInvoiceError(isAr ? "وصلت للحد المجاني للفواتير. ترقَّ للاحترافي." : "Free invoice limit reached. Upgrade to Pro.");
        } else if (result.code === "not_accepted") {
          setCreateInvoiceError(isAr ? "يمكن إصدار الفاتورة فقط للعروض المقبولة." : "Invoice can only be created for accepted proposals.");
        } else {
          setCreateInvoiceError(isAr ? "حدث خطأ أثناء إنشاء الفاتورة. حاول مرة أخرى." : "Could not create invoice. Try again.");
        }
        return;
      }
      track("invoice_generated_from_proposal", { locale, proposal_id: proposalId, invoice_id: result.invoice_id });
      router.push(`/invoices/${result.invoice_id}` as `/invoices/${string}`);
    });
  }

  // Whether this status can transition to accepted/declined
  const canMarkOutcome = ["sent", "viewed", "final"].includes(status);

  // Whether the "Create gig" CTA should be shown (accepted, or sent/viewed for convenience)
  const showCreateGigCta = ["accepted", "sent", "viewed", "final"].includes(status);

  // Whether the "Create invoice" CTA should be shown — only for accepted proposals
  const showCreateInvoiceCta = status === "accepted";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div
        dir={dir}
        className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 space-y-4 ${font}`}
      >
        <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase">
          {/* Section label reuse from ProposalFlow */}
          {isAr ? "الإجراءات" : "Actions"}
        </p>

        <div className="flex flex-wrap gap-3">
          {/* Finalize — only when draft */}
          {status === "draft" && (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isFinalizing}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
            >
              {isFinalizing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("finalizing")}
                </>
              ) : (
                t("finalize")
              )}
            </button>
          )}

          {/* Share */}
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-6 py-3 text-sm font-medium hover:bg-rizq-green/8 transition-all ${font}`}
          >
            <Share2 size={14} />
            {t("share")}
          </button>

          {/* Create gig from proposal — shown when status is accepted/sent/viewed/final */}
          {showCreateGigCta && (
            <button
              type="button"
              onClick={handleCreateGig}
              disabled={isCreatingGig}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
            >
              {isCreatingGig ? (
                <><Loader2 size={14} className="animate-spin" /> {t("creatingGig")}</>
              ) : (
                <><PlusCircle size={14} /> {t("createGig")}</>
              )}
            </button>
          )}

          {/* Generate invoice from proposal — only when accepted */}
          {showCreateInvoiceCta && (
            <button
              type="button"
              onClick={handleCreateInvoice}
              disabled={isCreatingInvoice}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-6 py-3 text-sm font-medium hover:bg-rizq-green/8 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
            >
              {isCreatingInvoice ? (
                <><Loader2 size={14} className="animate-spin" /> {tInv("generating")}</>
              ) : (
                <><FileText size={14} /> {tInv("generateFromProposal")}</>
              )}
            </button>
          )}

          {/* Save as template */}
          {!templateSaved ? (
            <button
              type="button"
              onClick={() => setShowTemplateSave((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-6 py-3 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
            >
              <BookmarkPlus size={14} />
              {tTemplates("saveAsTemplate")}
            </button>
          ) : (
            <span
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/30 bg-rizq-green/10 text-rizq-green px-6 py-3 text-sm font-medium ${font}`}
            >
              <BookmarkPlus size={14} />
              {tTemplates("saveAsTemplate")} ✓
            </span>
          )}

          {/* Mark accepted / declined */}
          {canMarkOutcome && status !== "accepted" && status !== "declined" && (
            <>
              <button
                type="button"
                onClick={handleMarkAccepted}
                disabled={isMarkingStatus}
                className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/40 text-emerald-700 px-6 py-3 text-sm font-medium hover:bg-emerald-50 transition-all disabled:opacity-70 ${font}`}
              >
                {isMarkingStatus ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {isMarkingStatus ? t("markingStatus") : t("markAccepted")}
              </button>

              <button
                type="button"
                onClick={handleMarkDeclined}
                disabled={isMarkingStatus}
                className={`inline-flex items-center gap-2 rounded-full border border-red-300/50 text-red-600 px-6 py-3 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-70 ${font}`}
              >
                {isMarkingStatus ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                {isMarkingStatus ? t("markingStatus") : t("markDeclined")}
              </button>
            </>
          )}
        </div>

        {/* Decline reason sub-form */}
        {showDeclineReason && !isMarkingStatus && (
          <div
            dir={dir}
            className={`rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3 animate-fade-in ${font}`}
          >
            <label
              htmlFor="decline-reason"
              className={`block text-sm font-medium text-rizq-ink ${font}`}
            >
              {t("declineReasonLabel")}
            </label>
            <textarea
              id="decline-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              placeholder={t("declineReasonPlaceholder")}
              className={`w-full rounded-xl border border-red-200 bg-white/80 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 resize-none ${font}`}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleMarkDeclined}
                disabled={isMarkingStatus}
                className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70 ${font}`}
              >
                {t("declineConfirm")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeclineReason(false);
                  setDeclineReason("");
                }}
                className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create gig error */}
      {createGigError && (
        <p role="alert" className={`text-sm text-red-700 px-1 ${font}`}>
          {createGigError}
        </p>
      )}

      {/* Create invoice error */}
      {createInvoiceError && (
        <p role="alert" className={`text-sm text-red-700 px-1 ${font}`}>
          {createInvoiceError}
        </p>
      )}

      {/* Template name prompt */}
      {showTemplateSave && (
        <div
          dir={dir}
          className={`rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 p-4 space-y-3 animate-fade-in ${font}`}
        >
          <label
            htmlFor="template-name"
            className={`block text-sm font-medium text-rizq-ink ${font}`}
          >
            {tTemplates("namePromptLabel")}
          </label>
          <input
            id="template-name"
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={tTemplates("namePromptPlaceholder")}
            className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 transition-colors ${font}`}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || isSavingTemplate}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-50 ${font}`}
            >
              {isSavingTemplate
                ? tTemplates("namePromptSubmitting")
                : tTemplates("namePromptSubmit")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTemplateSave(false);
                setTemplateName("");
              }}
              className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal
          locale={locale}
          proposalId={proposalId}
          initialShared={publicShare}
          initialToken={shareToken}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
