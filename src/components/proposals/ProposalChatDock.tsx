"use client";

/**
 * ProposalChatDock — always-visible aurora bar (feature 001 / US4 redesign).
 *
 * Floats center-bottom over the proposal page. No launcher button — the input
 * is always present. The last AI reply appears above the bar as bare text with
 * a cream text-shadow for legibility; it is replaced on every new send.
 *
 * WCAG 2.1 AA: placeholder #595959 on frosted cream ≈5.9:1, body text 17:1,
 * send icon 7.5:1. Focus ring via .ai-aurora-inner:focus-within in globals.css.
 */

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowUp, Loader2 } from "lucide-react";
import { proposalChat } from "@/app/actions/proposals/proposalChat";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Reply = { id: number; text: string; meta?: string };

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  cover_letter: { ar: "الخطاب التعريفي", en: "cover letter" },
  understanding: { ar: "فهم المشروع", en: "understanding" },
  approach: { ar: "المنهجية", en: "approach" },
  scope_of_work: { ar: "نطاق العمل", en: "scope of work" },
  assumptions: { ar: "الافتراضات", en: "assumptions" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [pending, startTransition] = useTransition();

  function labelFor(id: string): string {
    return SECTION_LABELS[id]?.[isAr ? "ar" : "en"] ?? id;
  }

  function send() {
    const msg = draft.trim();
    if (!msg || pending) return;
    setDraft("");
    startTransition(async () => {
      const res = await proposalChat({ proposal_id: proposalId, message: msg });
      if (!res.ok) {
        setReply({
          id: Date.now(),
          text:
            res.code === "ai_unconfigured" ? t("unavailable") : t("error"),
        });
        return;
      }
      const replyText = isAr ? res.reply_ar : res.reply_en;
      const meta =
        res.modified.length > 0
          ? t("updated", {
              sections: res.modified
                .map(labelFor)
                .join(isAr ? "، " : ", "),
            })
          : undefined;
      setReply({ id: Date.now(), text: replyText, meta });
      if (res.modified.length > 0) router.refresh();
    });
  }

  return (
    <div
      className={`print:hidden fixed bottom-7 left-1/2 z-50 w-[min(600px,calc(100vw-48px))] -translate-x-1/2 ${font}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Last AI reply — floats above bar, no card bg */}
      <AnimatePresence mode="wait">
        {reply && (
          <motion.div
            key={reply.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="mb-2.5 flex items-start gap-2 px-1"
          >
            <span
              className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-rizq-green"
              aria-hidden="true"
            >
              <Sparkles size={11} strokeWidth={2} className="text-white" />
            </span>
            <div>
              <p className="mb-1 text-[11px] font-semibold leading-none text-rizq-green">
                {t("aiLabel")}
              </p>
              <p
                className="text-[13.5px] leading-relaxed text-rizq-ink"
                style={{
                  textShadow: "0 0 20px #FAF5EC, 0 0 16px #FAF5EC",
                }}
              >
                {reply.text}
                {reply.meta && (
                  <span className="mt-0.5 block text-[11px] text-rizq-green">
                    {reply.meta}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aurora border shell + frosted input bar */}
      <div className="ai-aurora-border">
        <div className="ai-aurora-inner">
          <Sparkles
            size={17}
            strokeWidth={2.2}
            className="shrink-0 text-rizq-green"
            aria-hidden="true"
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("placeholder")}
            disabled={pending}
            dir="auto"
            aria-label={t("inputLabel")}
            className="flex-1 border-none bg-transparent text-sm text-rizq-ink outline-none placeholder:text-[#595959] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !draft.trim()}
            aria-label={t("send")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-rizq-green text-white transition-colors hover:bg-rizq-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rizq-green disabled:bg-rizq-green/60"
          >
            {pending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
