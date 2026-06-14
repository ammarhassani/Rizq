"use client";

/**
 * FollowUpCards — quick-answer UI for clarifying follow-up questions.
 * Phase-2 task 2.9.
 *
 * Renders each FollowUpTemplate as a mobile-first card with quick-select
 * option buttons. Collects answers keyed by field_name.
 * "Done" calls onSubmit(answers); per-question "Skip" and global "Skip all"
 * call onSkip() to proceed with the current artifact.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { FollowUpTemplate } from "@/lib/proposals/followUp";

type Props = {
  locale: "ar" | "en";
  questions: FollowUpTemplate[];
  onSubmit: (answers: Record<string, unknown>) => void;
  onSkip: () => void;
  pending: boolean;
};

export function FollowUpCards({ locale, questions, onSubmit, onSkip, pending }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const isAr = locale === "ar";

  const labels = {
    done: isAr ? "تم. أنشئ العرض" : "Done. Generate proposal",
    skipAll: isAr ? "تخطّي الكل" : "Skip all",
    skip: isAr ? "تخطّي" : "Skip",
    heading: isAr ? "أسئلة سريعة لتحسين العرض" : "Quick questions to refine your proposal",
    subheading: isAr
      ? "اختياري. إجاباتك تجعل السعر والنطاق أدق."
      : "Optional. Your answers make the price and scope more accurate.",
  };

  function toggle(fieldName: string, value: unknown) {
    setAnswers((prev) => {
      // Toggle off if same value clicked again
      if (prev[fieldName] === value) {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      }
      return { ...prev, [fieldName]: value };
    });
  }

  function skipQuestion(fieldName: string) {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  return (
    <div
      dir={dir}
      className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-6 animate-fade-in ${font}`}
    >
      {/* Header */}
      <div>
        <p className="eyebrow mb-2 text-rizq-green">
          {isAr ? "تحليل رِزق" : "Rizq Analysis"}
        </p>
        <h2 className="text-xl font-semibold text-rizq-ink">{labels.heading}</h2>
        <p className="mt-1 text-sm text-rizq-ink-soft">{labels.subheading}</p>
      </div>

      {/* Question cards */}
      <div className="space-y-5">
        {questions.map((q) => {
          const questionText = isAr ? q.question_ar : q.question_en;
          const options = q.options_json ?? [];
          const currentAnswer = answers[q.field_name];

          return (
            <div
              key={q.id}
              className="rounded-2xl border border-rizq-gold/20 bg-white/50 p-5 space-y-3"
            >
              <p className="text-sm font-medium text-rizq-ink">{questionText}</p>

              {options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => {
                    const label = isAr ? opt.label_ar : opt.label_en;
                    const isSelected = currentAnswer === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => toggle(q.field_name, opt.value)}
                        disabled={pending}
                        className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                          isSelected
                            ? "bg-rizq-green text-rizq-cream shadow-sm"
                            : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/50 hover:bg-rizq-green/8"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.allow_skip && (
                <button
                  type="button"
                  onClick={() => skipQuestion(q.field_name)}
                  disabled={pending}
                  className="text-xs text-rizq-ink-soft/70 hover:text-rizq-ink-soft transition-colors disabled:opacity-50"
                >
                  {labels.skip}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => onSubmit(answers)}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
        >
          {pending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>{isAr ? "جارٍ الإنشاء…" : "Generating…"}</span>
            </>
          ) : (
            <span>{labels.done}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors disabled:opacity-50"
        >
          {labels.skipAll}
        </button>
      </div>
    </div>
  );
}
