"use client";

/**
 * MethodologyFaq — P6.2 client island.
 * A public, unauthenticated Q&A widget that answers questions about
 * Rizq's methodology using only the published sections as the knowledge base.
 * AI answers are clearly labeled. Out-of-scope answers are honest.
 */

import { useTransition, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { askMethodologyAction } from "@/app/actions/methodology/askMethodologyAction";

type Props = {
  locale: "ar" | "en";
  /** Pre-built sections text passed from the server component */
  sectionsText: string;
};

export function MethodologyFaq({ locale, sectionsText }: Props) {
  const t = useTranslations("Methodology.Faq");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const answerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isPending) return;

    setAnswer(null);
    setError(null);

    startTransition(async () => {
      const result = await askMethodologyAction({ question: q });
      if (result.ok) {
        setAnswer(result.answer);
        // Scroll to answer
        setTimeout(() => {
          answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      } else {
        setError(
          isAr
            ? "تعذّر الحصول على إجابة. حاول مرة أخرى."
            : "Could not get an answer. Please try again."
        );
      }
    });
  };

  return (
    <section className={`${font}`} aria-label={isAr ? "اسأل عن منهجيتنا" : "Ask about our methodology"}>
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rizq-green/10 text-rizq-green">
          <Sparkles size={15} strokeWidth={1.8} />
        </span>
        <h2 className="text-lg font-semibold text-rizq-ink">
          {t("heading")}
        </h2>
      </div>
      <p className="text-sm text-rizq-ink-soft mb-5">{t("subheading")}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={500}
            disabled={isPending}
            className={`
              flex-1 rounded-xl border border-rizq-gold/30 bg-rizq-cream/80
              px-4 py-3 text-sm text-rizq-ink placeholder-rizq-ink-soft/50
              focus:outline-none focus:ring-2 focus:ring-rizq-green/30 focus:border-rizq-green/40
              disabled:opacity-60 transition-colors ${font}
            `}
            dir={isAr ? "rtl" : "ltr"}
          />
          <button
            type="submit"
            disabled={isPending || !question.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-rizq-green px-4 py-3 text-sm font-medium text-rizq-cream hover:bg-rizq-green-dark disabled:opacity-50 transition-all shrink-0"
            aria-label={t("askButton")}
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SendHorizonal size={16} className={isAr ? "rotate-180" : ""} />
            )}
            <span className="hidden sm:inline">{t("askButton")}</span>
          </button>
        </div>
      </form>

      {/* Answer area */}
      {(answer || error) && (
        <div
          ref={answerRef}
          className="mt-5 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 p-5"
        >
          {answer && (
            <>
              {/* AI label */}
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rizq-green/10 px-3 py-1 text-[11px] tracking-[0.14em] uppercase text-rizq-green">
                <Sparkles size={11} strokeWidth={1.8} />
                {t("aiLabel")}
              </p>
              <p className={`text-sm leading-relaxed text-rizq-ink whitespace-pre-wrap ${font}`}>
                {answer}
              </p>
              <p className={`mt-3 text-[11px] text-rizq-ink-soft/60 ${font}`}>
                {t("aiDisclaimer")}
              </p>
            </>
          )}
          {error && (
            <p className={`text-sm text-red-600/80 ${font}`}>{error}</p>
          )}
        </div>
      )}
    </section>
  );
}
