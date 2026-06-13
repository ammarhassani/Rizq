"use client";

/**
 * ScopeInsight — on-mount async scope comparison card.
 * Phase-2 task 2.9.
 *
 * Calls getScopeComparison on mount. If insight is non-null, renders a
 * small "Rizq Analysis" card with the bilingual text. Renders nothing while
 * loading or when the user has <3 past proposals (null insight).
 */

import { useEffect, useState } from "react";
import { getScopeComparison } from "@/app/actions/proposals/compareScopeAction";

type Props = {
  locale: "ar" | "en";
  proposalId: string;
};

type State =
  | { status: "loading" }
  | { status: "done"; insight: { ar: string; en: string } | null }
  | { status: "error" };

export function ScopeInsight({ locale, proposalId }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  useEffect(() => {
    let cancelled = false;
    getScopeComparison({ proposal_id: proposalId })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setState({ status: "done", insight: null });
          return;
        }
        setState({ status: "done", insight: result.insight });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => { cancelled = true; };
  }, [proposalId]);

  // Render nothing while loading, on error, or when insight is null
  if (state.status !== "done" || !state.insight) return null;

  const text = isAr ? state.insight.ar : state.insight.en;

  return (
    <div
      dir={dir}
      className={`rounded-2xl border border-rizq-gold/25 bg-rizq-gold/8 px-5 py-4 ${font}`}
    >
      <p className="text-xs font-medium text-rizq-gold-dark tracking-wide uppercase mb-1">
        {isAr ? "تحليل رِزق" : "Rizq Insight"}
      </p>
      <p className="text-sm text-rizq-ink leading-relaxed">{text}</p>
    </div>
  );
}
