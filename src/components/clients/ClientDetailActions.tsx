"use client";

/**
 * ClientDetailActions — client island for detail page.
 * Phase-3 task 3.2 (existing actions) + task 3.3–3.5 (AI actions).
 */

import { useState, useTransition } from "react";
import {
  Loader2,
  Edit2,
  Archive,
  MessageSquarePlus,
  PhoneCall,
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { archiveClient, addClientNote, logContact } from "@/app/actions/clients/clients";
import {
  generateClientInsightsAction,
  draftFollowupAction,
  generatePersonaAction,
  refreshFollowUpPriorityAction,
} from "@/app/actions/clients/clientAi";
import { track } from "@/lib/analytics/track";
import { ClientForm } from "./ClientForm";

type Props = {
  locale: "ar" | "en";
  clientId: string;
  clientName: string;
  initialNotes: string;
  /** Total gig count — needed to conditionally show persona button. */
  totalGigs?: number;
};

export function ClientDetailActions({
  locale,
  clientId,
  clientName,
  initialNotes: _initialNotes,
  totalGigs = 0,
}: Props) {
  const t = useTranslations("Clients.detail");
  const tAi = useTranslations("Clients.ai");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // ── Existing state ──────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const [isArchiving, startArchiveTransition] = useTransition();
  const [isAddingNote, startAddNoteTransition] = useTransition();
  const [isLoggingContact, startLogContactTransition] = useTransition();

  // ── AI state ────────────────────────────────────────────────────────────
  const [insightError, setInsightError] = useState<string | null>(null);
  const [isGeneratingInsight, startInsightTransition] = useTransition();

  const [followupDraft, setFollowupDraft] = useState<string | null>(null);
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [showFollowupBox, setShowFollowupBox] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDraftingFollowup, startFollowupTransition] = useTransition();

  const [personaError, setPersonaError] = useState<string | null>(null);
  const [isGeneratingPersona, startPersonaTransition] = useTransition();

  const [isPriorityRefreshing, startPriorityTransition] = useTransition();

  // ── Existing handlers ───────────────────────────────────────────────────

  function handleArchive() {
    startArchiveTransition(async () => {
      const result = await archiveClient({ id: clientId });
      if (result.ok) {
        track("client_archived", { locale });
        router.push("/clients" as "/clients");
        router.refresh();
      }
    });
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    startAddNoteTransition(async () => {
      const result = await addClientNote({ id: clientId, note: noteText.trim() });
      if (result.ok) {
        track("client_note_added", { locale });
        setNoteText("");
        setShowNoteForm(false);
        router.refresh();
      }
    });
  }

  function handleLogContact() {
    startLogContactTransition(async () => {
      const result = await logContact({ id: clientId });
      if (result.ok) {
        track("client_contact_logged", { locale });
        router.refresh();
      }
    });
  }

  // ── AI handlers ─────────────────────────────────────────────────────────

  function handleGenerateInsight() {
    setInsightError(null);
    startInsightTransition(async () => {
      const result = await generateClientInsightsAction({ client_id: clientId });
      if (result.ok) {
        track("client_ai_insight_generated", { locale });
        router.refresh();
      } else if (result.code === "upgrade") {
        setInsightError(tAi("upgradeHint"));
      } else {
        setInsightError(isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again.");
      }
    });
  }

  function handleDraftFollowup() {
    setFollowupError(null);
    setFollowupDraft(null);
    setShowFollowupBox(true);
    startFollowupTransition(async () => {
      const result = await draftFollowupAction({ client_id: clientId });
      if (result.ok) {
        setFollowupDraft(result.draft);
        track("client_followup_drafted", { locale });
      } else {
        setFollowupError(isAr ? "حدث خطأ في صياغة الرسالة. حاول مرة أخرى." : "Couldn't draft the message. Try again.");
      }
    });
  }

  function handleCopyFollowup() {
    if (!followupDraft) return;
    navigator.clipboard.writeText(followupDraft).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }

  function handleGeneratePersona() {
    setPersonaError(null);
    startPersonaTransition(async () => {
      const result = await generatePersonaAction({ client_id: clientId });
      if (result.ok) {
        track("client_persona_generated", { locale });
        router.refresh();
      } else if (result.code === "upgrade") {
        setPersonaError(tAi("upgradeHint"));
      } else if (result.code === "insufficient_gigs") {
        setPersonaError(tAi("personaNeeds3Gigs"));
      } else {
        setPersonaError(isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again.");
      }
    });
  }

  function handleRefreshPriority() {
    startPriorityTransition(async () => {
      const result = await refreshFollowUpPriorityAction({ client_id: clientId });
      if (result.ok) {
        track("client_priority_refreshed", { locale });
        router.refresh();
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (showEdit) {
    return (
      <ClientForm
        locale={locale}
        mode="edit"
        initialData={{ id: clientId }}
        onSuccess={() => { setShowEdit(false); router.refresh(); }}
      />
    );
  }

  // Build WhatsApp link (if draft exists)
  const waLink = followupDraft
    ? `https://wa.me/?text=${encodeURIComponent(followupDraft)}`
    : null;

  return (
    <div className="space-y-4">
      {/* ── Standard actions bar ─────────────────────────────────────────── */}
      <div
        dir={dir}
        className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 ${font}`}
      >
        <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-4">
          {isAr ? "الإجراءات" : "Actions"}
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

          {/* Add note */}
          <button
            type="button"
            onClick={() => setShowNoteForm((s) => !s)}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
          >
            <MessageSquarePlus size={14} />
            {t("addNote")}
          </button>

          {/* Log contact */}
          <button
            type="button"
            onClick={handleLogContact}
            disabled={isLoggingContact}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-70 ${font}`}
          >
            {isLoggingContact ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
            {t("logContact")}
          </button>

          {/* Archive */}
          <button
            type="button"
            onClick={() => setShowArchiveConfirm(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-red-300/50 text-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-50 transition-all ${font}`}
          >
            <Archive size={14} />
            {t("archive")}
          </button>
        </div>

        {/* Note form */}
        {showNoteForm && (
          <div dir={dir} className={`mt-4 space-y-3 animate-fade-in ${font}`}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder={t("addNotePlaceholder")}
              className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green focus:bg-rizq-cream transition-colors resize-none placeholder:text-rizq-ink-soft/50 ${font}`}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteText.trim() || isAddingNote}
                className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-50 ${font}`}
              >
                {isAddingNote ? <><Loader2 size={14} className="animate-spin" />{t("saving")}</> : t("saveNote")}
              </button>
              <button
                type="button"
                onClick={() => { setShowNoteForm(false); setNoteText(""); }}
                className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── AI actions bar ─────────────────────────────────────────────────── */}
      <div
        dir={dir}
        className={`rounded-2xl border border-rizq-gold/30 bg-rizq-gold/5 p-5 ${font}`}
      >
        <p className="text-xs font-semibold text-rizq-gold-dark tracking-wide uppercase mb-4">
          {isAr ? "ميزات رِزق AI" : "Rizq AI"}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Generate Insights — Pro */}
          <button
            type="button"
            onClick={handleGenerateInsight}
            disabled={isGeneratingInsight}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/70 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-70 ${font}`}
          >
            {isGeneratingInsight ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isGeneratingInsight ? tAi("loading") : tAi("generateInsights")}
          </button>

          {/* Draft Follow-up — Free */}
          <button
            type="button"
            onClick={handleDraftFollowup}
            disabled={isDraftingFollowup}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/70 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-70 ${font}`}
          >
            {isDraftingFollowup ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {isDraftingFollowup ? tAi("loading") : tAi("draftFollowup")}
          </button>

          {/* Generate Persona — Pro, only if >= 3 gigs */}
          {totalGigs >= 3 && (
            <button
              type="button"
              onClick={handleGeneratePersona}
              disabled={isGeneratingPersona}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/70 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-70 ${font}`}
            >
              {isGeneratingPersona ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <User size={14} />
              )}
              {isGeneratingPersona ? tAi("loading") : tAi("generatePersona")}
            </button>
          )}

          {/* Refresh Priority — Free, rule-based */}
          <button
            type="button"
            onClick={handleRefreshPriority}
            disabled={isPriorityRefreshing}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/70 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:opacity-70 ${font}`}
          >
            {isPriorityRefreshing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {isAr ? "تحديث الأولوية" : "Refresh priority"}
          </button>
        </div>

        {/* Insight error / upgrade hint */}
        {insightError && (
          <p className={`mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 ${font}`}>
            {insightError}
          </p>
        )}

        {/* Persona error / upgrade hint */}
        {personaError && (
          <p className={`mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 ${font}`}>
            {personaError}
          </p>
        )}
      </div>

      {/* ── Follow-up draft box ─────────────────────────────────────────────── */}
      {showFollowupBox && (
        <div
          dir={dir}
          className={`rounded-2xl border border-rizq-green/25 bg-rizq-cream/85 p-5 space-y-3 animate-fade-in ${font}`}
        >
          <p className="text-xs font-semibold text-rizq-green tracking-wide uppercase">
            {tAi("draftFollowup")}
          </p>

          {isDraftingFollowup && (
            <div className="flex items-center gap-2 text-sm text-rizq-ink-soft">
              <Loader2 size={14} className="animate-spin" />
              {tAi("loading")}
            </div>
          )}

          {followupError && (
            <p className={`text-xs text-red-600 ${font}`}>{followupError}</p>
          )}

          {followupDraft && (
            <>
              {/* Draft text area (read-only, selectable) */}
              <textarea
                readOnly
                value={followupDraft}
                rows={4}
                dir="rtl"
                className={`w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-3 text-sm text-rizq-ink resize-none font-arabic focus:outline-none`}
              />

              <div className="flex flex-wrap gap-3">
                {/* Copy button */}
                <button
                  type="button"
                  onClick={handleCopyFollowup}
                  className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors ${font}`}
                >
                  {isCopied ? (
                    <><Check size={14} />{tAi("copy")}</>
                  ) : (
                    <><Copy size={14} />{tAi("copy")}</>
                  )}
                </button>

                {/* WhatsApp link */}
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full border border-green-400/50 text-green-700 px-5 py-2.5 text-sm font-medium hover:bg-green-50 transition-colors ${font}`}
                  >
                    <Send size={14} />
                    {tAi("whatsapp")}
                  </a>
                )}

                {/* Close */}
                <button
                  type="button"
                  onClick={() => { setShowFollowupBox(false); setFollowupDraft(null); }}
                  className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
                >
                  {t("cancel")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Archive confirm ─────────────────────────────────────────────────── */}
      {showArchiveConfirm && (
        <div
          dir={dir}
          className={`rounded-2xl border border-red-200 bg-red-50/60 p-5 space-y-3 animate-fade-in ${font}`}
        >
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("archiveConfirm", { name: clientName })}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleArchive}
              disabled={isArchiving}
              className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isArchiving ? <><Loader2 size={14} className="animate-spin" />{t("archiving")}</> : t("archiveConfirmBtn")}
            </button>
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(false)}
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
