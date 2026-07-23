"use client";

/**
 * ProposalChatDock — proposal editor workspace + conversational AI (US4).
 *
 * Wraps the proposal body as `children` and lays it out as a two-column
 * workspace on lg+: the proposal fills the left, a sticky full-height "Rizq AI"
 * panel sits on the inline-end (right in LTR, left in RTL — away from the RTL
 * sidebar). Because the panel is IN-FLOW (not fixed), the proposal grows to meet
 * it — no dead channel. Below lg the panel collapses to a bottom composer bar.
 *
 * The composer is a single aurora-bordered widget. While empty + unfocused its
 * placeholder cycles example prompts with a typewriter-in / swoosh-out loop.
 *
 * AI replies render as aurora chips; the freelancer's turns are green bubbles.
 * Price/dates/terms are never touched by the action.
 *
 * WCAG 2.1 AA: placeholder #595959 ≈5.9:1, body text 17:1, send icon 7.5:1.
 * Focus ring via .ai-aurora-inner:focus-within. Typewriter honors reduced motion.
 */

import {
  useState,
  useEffect,
  useRef,
  useTransition,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowUp, Loader2 } from "lucide-react";
import { proposalChat } from "@/app/actions/proposals/proposalChat";

// ---------------------------------------------------------------------------
// Types + helpers
// ---------------------------------------------------------------------------

type Msg = { id: number; role: "user" | "ai"; text: string; meta?: string };

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  cover_letter: { ar: "الخطاب التعريفي", en: "cover letter" },
  understanding: { ar: "فهم المشروع", en: "understanding" },
  approach: { ar: "المنهجية", en: "approach" },
  scope_of_work: { ar: "نطاق العمل", en: "scope of work" },
  assumptions: { ar: "الافتراضات", en: "assumptions" },
};

let seq = 0;
const nextId = () => ++seq;

// ---------------------------------------------------------------------------
// Animated placeholder — typewriter in, hold 6–9s, swoosh out, next, loop
// ---------------------------------------------------------------------------

function AnimatedPlaceholder({ phrases }: { phrases: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const phrase = phrases[index] ?? "";
    // Hold time varies 6–8.4s so the cycle feels organic, not metronomic.
    const hold = 6000 + (index % 3) * 1200;

    if (reduce) {
      const show = setTimeout(() => setTyped(phrase), 0);
      const advance = setTimeout(
        () => setIndex((i) => (i + 1) % phrases.length),
        hold
      );
      return () => {
        clearTimeout(show);
        clearTimeout(advance);
      };
    }

    const speed = 42;
    let char = 0;
    let typer: ReturnType<typeof setInterval> | undefined;
    // Small delay lets the swoosh-in settle before characters start; the blank
    // reset happens here (not synchronously) to avoid a cascading render.
    const startDelay = setTimeout(() => {
      setTyped("");
      typer = setInterval(() => {
        char += 1;
        setTyped(phrase.slice(0, char));
        if (char >= phrase.length && typer) clearInterval(typer);
      }, speed);
    }, 240);
    const advance = setTimeout(
      () => setIndex((i) => (i + 1) % phrases.length),
      240 + phrase.length * speed + hold
    );

    return () => {
      clearTimeout(startDelay);
      if (typer) clearInterval(typer);
      clearTimeout(advance);
    };
  }, [index, phrases, reduce]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={index}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -7 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex min-w-0 items-center text-sm text-[#595959]"
        dir="auto"
      >
        <span className="truncate">{typed}</span>
        {!reduce && <span className="ai-caret shrink-0" aria-hidden="true" />}
      </motion.span>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// AI reply chip
// ---------------------------------------------------------------------------

function AiChip({ text, meta, aiLabel }: { text: string; meta?: string; aiLabel: string }) {
  return (
    <div className="ai-aurora-border self-start max-w-[88%]">
      <div className="ai-aurora-reply">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-rizq-green">
          <Sparkles size={10} strokeWidth={2.5} aria-hidden="true" />
          {aiLabel}
        </p>
        <p className="text-[13px] leading-snug text-rizq-ink" dir="auto">
          {text}
        </p>
        {meta && <p className="mt-1 text-[11px] text-rizq-green">{meta}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace + AI
// ---------------------------------------------------------------------------

export function ProposalChatDock({
  proposalId,
  locale,
  children,
}: {
  proposalId: string;
  locale: "ar" | "en";
  children: ReactNode;
}) {
  const t = useTranslations("Proposals.chat");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();

  const prompts: string[] = (() => {
    try {
      const raw = t.raw("prompts");
      return Array.isArray(raw) ? (raw as string[]) : [];
    } catch {
      return [];
    }
  })();

  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
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
    setDraft("");
    setMessages((m) => [...m, { id: nextId(), role: "user", text: msg }]);
    startTransition(async () => {
      const res = await proposalChat({ proposal_id: proposalId, message: msg });
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: "ai",
            text: res.code === "ai_unconfigured" ? t("unavailable") : t("error"),
          },
        ]);
        return;
      }
      const replyText = isAr ? res.reply_ar : res.reply_en;
      const meta =
        res.modified.length > 0
          ? t("updated", {
              sections: res.modified.map(labelFor).join(isAr ? "، " : ", "),
            })
          : undefined;
      setMessages((m) => [...m, { id: nextId(), role: "ai", text: replyText, meta }]);
      if (res.modified.length > 0) router.refresh();
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const aiLabel = t("aiLabel");
  const lastAi = [...messages].reverse().find((m) => m.role === "ai");
  const showPlaceholder = draft === "" && !focused && prompts.length > 0;

  const composer = (
    <div className="ai-aurora-border">
      <div className="ai-aurora-inner">
        <Sparkles
          size={18}
          strokeWidth={2.2}
          className="shrink-0 text-rizq-green"
          aria-hidden="true"
        />
        <div className="relative min-w-0 flex-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder=""
            disabled={pending}
            dir="auto"
            aria-label={t("inputLabel")}
            className="w-full border-none bg-transparent text-sm text-rizq-ink outline-none disabled:opacity-60"
          />
          {showPlaceholder && (
            <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
              <AnimatedPlaceholder phrases={prompts} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={send}
          disabled={pending || !draft.trim()}
          aria-label={t("send")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl aurora-fill transition-colors hover:bg-rizq-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rizq-green disabled:bg-rizq-green/60"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp size={15} strokeWidth={2.5} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} className={font}>
      {/* CSS grid (not flex): minmax(0,1fr) lets the proposal track shrink
          without ever forcing horizontal overflow. Two columns only at xl,
          where there is genuine room for both. */}
      <div className="mx-auto w-full max-w-[1400px] xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-8">
        {/* Proposal column */}
        <div className="min-w-0">{children}</div>

        {/* Sticky full-height AI panel (xl and up) */}
        <aside aria-label={aiLabel} className="hidden xl:block min-w-0">
          <div className="sticky top-20 flex h-[calc(100vh-6rem)] flex-col gap-3 print:hidden">
            <header className="flex items-center gap-2 text-rizq-green">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full aurora-fill"
                aria-hidden="true"
              >
                <Sparkles size={14} strokeWidth={2.2} className="text-[var(--on-accent)]" />
              </span>
              <span className="text-sm font-semibold">{aiLabel}</span>
            </header>

            <div ref={listRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto pe-1">
              {messages.length === 0 && (
                <p className="text-[13px] leading-relaxed text-rizq-ink-soft">{t("intro")}</p>
              )}
              {messages.map((m) =>
                m.role === "ai" ? (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex flex-col"
                  >
                    <AiChip text={m.text} meta={m.meta} aiLabel={aiLabel} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex justify-end"
                  >
                    <p
                      className="max-w-[88%] rounded-2xl aurora-fill px-3.5 py-2 text-[13px] leading-snug"
                      dir="auto"
                    >
                      {m.text}
                    </p>
                  </motion.div>
                )
              )}
              {pending && (
                <div className="flex items-center gap-2 text-xs text-rizq-ink-soft">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  <span>{t("sending")}</span>
                </div>
              )}
            </div>

            {composer}
          </div>
        </aside>
      </div>

      {/* Compact bottom composer (below xl) */}
      <div className="xl:hidden fixed inset-x-4 bottom-4 z-40 flex flex-col gap-2 print:hidden">
        {lastAi && (
          <motion.div
            key={lastAi.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col"
          >
            <AiChip text={lastAi.text} meta={lastAi.meta} aiLabel={aiLabel} />
          </motion.div>
        )}
        {composer}
      </div>
    </div>
  );
}
