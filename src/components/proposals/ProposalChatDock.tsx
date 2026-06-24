"use client";

/**
 * ProposalChatDock — hovering conversational editor (feature 001 / US4).
 *
 * A floating dock on the proposal detail page (owner, editable status only). The
 * freelancer types a free-text revision; the AI edits the responsible prose
 * section(s) in place. Price/dates/terms are never touched. A scope change
 * (added deliverable) is surfaced as a note directing the freelancer to confirm
 * it in the editor (propose → confirm), not auto-applied.
 */

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2, ArrowUp } from "lucide-react";
import { proposalChat } from "@/app/actions/proposals/proposalChat";

type Msg = { role: "user" | "ai"; text: string; meta?: string };

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  cover_letter: { ar: "الخطاب التعريفي", en: "cover letter" },
  understanding: { ar: "فهم المشروع", en: "understanding" },
  approach: { ar: "المنهجية", en: "approach" },
  scope_of_work: { ar: "نطاق العمل", en: "scope of work" },
  assumptions: { ar: "الافتراضات", en: "assumptions" },
};

export function ProposalChatDock({
  proposalId,
  locale,
}: {
  proposalId: string;
  locale: "ar" | "en";
}) {
  const t = useTranslations("Proposals.chat");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function labelFor(id: string): string {
    return SECTION_LABELS[id]?.[isAr ? "ar" : "en"] ?? id;
  }

  function send() {
    const msg = draft.trim();
    if (!msg || pending) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setDraft("");
    startTransition(async () => {
      const res = await proposalChat({ proposal_id: proposalId, message: msg });
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "ai", text: res.code === "ai_unconfigured" ? t("unavailable") : t("error") },
        ]);
        return;
      }
      const reply = isAr ? res.reply_ar : res.reply_en;
      const meta =
        res.modified.length > 0
          ? t("updated", { sections: res.modified.map(labelFor).join(isAr ? "، " : ", ") })
          : undefined;
      const next: Msg[] = [{ role: "ai", text: reply, meta }];
      if (res.scope_change) {
        const name = isAr ? res.scope_change.deliverable_ar : res.scope_change.deliverable_en;
        next.push({ role: "ai", text: t("scopeChange", { deliverable: name }) });
      }
      setMessages((m) => [...m, ...next]);
      if (res.modified.length > 0) router.refresh();
    });
  }

  return (
    <div className="print:hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed bottom-5 end-5 z-50 inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream ps-4 pe-5 py-3 shadow-lg hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
          >
            <Sparkles size={18} strokeWidth={2} />
            <span className="text-sm font-medium">{t("open")}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed bottom-5 end-5 z-50 flex w-[min(92vw,380px)] flex-col rounded-3xl border border-rizq-gold/30 bg-rizq-cream shadow-2xl ${font}`}
            style={{ maxHeight: "min(70vh, 560px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rizq-gold/20 px-5 py-3.5">
              <div className="flex items-center gap-2 text-rizq-green">
                <Sparkles size={17} strokeWidth={2} />
                <span className="text-sm font-semibold">{t("title")}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={isAr ? "إغلاق" : "Close"}
                className="text-rizq-ink-soft hover:text-rizq-ink transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-rizq-ink-soft leading-relaxed">{t("intro")}</p>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-rizq-green text-rizq-cream"
                        : "bg-white/70 text-rizq-ink border border-rizq-gold/20"
                    }`}
                  >
                    <span dir="auto">{m.text}</span>
                    {m.meta && (
                      <span className="mt-1 block text-xs text-rizq-green/80">{m.meta}</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {pending && (
                <div className="flex items-center gap-2 text-xs text-rizq-ink-soft">
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t("sending")}</span>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-rizq-gold/20 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={t("placeholder")}
                  disabled={pending}
                  dir="auto"
                  className="flex-1 resize-none rounded-2xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={pending || !draft.trim()}
                  aria-label={t("send")}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rizq-green text-rizq-cream hover:bg-rizq-green-dark transition-colors disabled:opacity-50"
                >
                  <ArrowUp size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
