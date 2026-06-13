"use client";

/**
 * ClientDetailActions — client island for detail page. Phase-3 task 3.2.
 */

import { useState, useTransition } from "react";
import { Loader2, Edit2, Archive, MessageSquarePlus, PhoneCall } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { archiveClient, addClientNote, logContact } from "@/app/actions/clients/clients";
import { track } from "@/lib/analytics/track";
import { ClientForm } from "./ClientForm";

type Props = {
  locale: "ar" | "en";
  clientId: string;
  clientName: string;
  initialNotes: string;
};

export function ClientDetailActions({ locale, clientId, clientName, initialNotes: _initialNotes }: Props) {
  const t = useTranslations("Clients.detail");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [showEdit, setShowEdit] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const [isArchiving, startArchiveTransition] = useTransition();
  const [isAddingNote, startAddNoteTransition] = useTransition();
  const [isLoggingContact, startLogContactTransition] = useTransition();

  function handleArchive() {
    startArchiveTransition(async () => {
      const result = await archiveClient({ id: clientId });
      if (result.ok) {
        track("client_archived", { locale });
        router.push("/clients" as "/clients");
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

  return (
    <div className="space-y-4">
      {/* Actions bar */}
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

      {/* Archive confirm */}
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
