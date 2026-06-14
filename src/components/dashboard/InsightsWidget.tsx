"use client";

import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown, RefreshCw, Sparkles } from "lucide-react";
import { getBusinessInsightsAction, submitInsightFeedbackAction } from "@/app/actions/dashboard/insights";
import type { InsightsActionResult } from "@/app/actions/dashboard/insights";

type Props = { locale: "ar" | "en" };

type InsightItem = {
  ar: string;
  en: string;
  kind: "income" | "client" | "proposal" | "deadline" | "general";
};

const kindColors: Record<InsightItem["kind"], string> = {
  income: "bg-emerald-50 border-emerald-200 text-emerald-800",
  client: "bg-blue-50 border-blue-200 text-blue-800",
  proposal: "bg-amber-50 border-amber-200 text-amber-800",
  deadline: "bg-red-50 border-red-200 text-red-800",
  general: "bg-rizq-cream border-rizq-gold/30 text-rizq-ink",
};

export function InsightsWidget({ locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [status, setStatus] = useState<"loading" | "ok" | "error" | "empty">("loading");
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [votes, setVotes] = useState<Record<number, "up" | "down">>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setStatus("loading");

    try {
      const res: InsightsActionResult = await getBusinessInsightsAction({ refresh });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      if (res.empty || res.insights.length === 0) {
        setStatus("empty");
        return;
      }
      setInsights(res.insights as InsightItem[]);
      setGeneratedAt(res.generated_at);
      setCached(res.cached);
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (index: number, vote: "up" | "down") => {
    setVotes((v) => ({ ...v, [index]: vote }));
    await submitInsightFeedbackAction({ index, vote }).catch(() => {});
  };

  if (status === "loading") {
    return (
      <div dir={dir} className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-rizq-gold animate-pulse" />
          <div className="h-4 w-32 bg-rizq-gold/20 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-3 h-16 bg-rizq-gold/10 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div dir={dir} className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8 text-center ${font}`}>
        <Sparkles className="h-8 w-8 text-rizq-gold mx-auto mb-3 opacity-50" />
        <p className={`text-sm text-rizq-ink-soft ${font}`}>
          {isAr ? "أنشئ أول عرض لتفعيل التحليلات" : "Create your first proposal to activate insights"}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div dir={dir} className={`rounded-3xl border border-red-100 bg-red-50/50 p-6 sm:p-8 ${font}`}>
        <p className={`text-sm text-red-700 ${font}`}>
          {isAr ? "تعذّر تحميل التحليلات. حاول مجددًا." : "Could not load insights. Try again."}
        </p>
        <button
          onClick={() => load()}
          className={`mt-3 text-xs text-rizq-green hover:underline ${font}`}
        >
          {isAr ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div dir={dir} className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8 col-span-full">
      {/* Header */}
      <div className={`flex items-center justify-between mb-5 ${font}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-rizq-gold" />
          <span className={`text-xs font-semibold text-rizq-ink-soft/70 uppercase tracking-wide ${font}`}>
            {isAr ? "تحليل رِزق" : "Rizq Insights"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cached && (
            <span className={`text-xs text-rizq-ink-soft/50 ${font}`}>
              {isAr ? "محفوظ مؤقتًا" : "Cached"}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs text-rizq-green hover:text-rizq-green-dark transition-colors disabled:opacity-50"
            aria-label={isAr ? "تحديث" : "Refresh"}
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span className={font}>{isAr ? "تحديث" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Insight cards */}
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${kindColors[insight.kind]}`}>
            <p className={`text-sm leading-relaxed ${font}`}>
              {isAr ? insight.ar : insight.en}
            </p>
            <div className={`mt-2 flex items-center justify-between gap-2 ${font}`}>
              <p className={`text-xs opacity-60 ${font}`}>
                {isAr ? "هذا تحليل آلي، ليس استشارة مهنية" : "AI-generated, not professional advice"}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleVote(i, "up")}
                  className={`p-1 rounded-full transition-colors ${votes[i] === "up" ? "text-emerald-600" : "text-current opacity-40 hover:opacity-70"}`}
                  aria-label="useful"
                >
                  <ThumbsUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleVote(i, "down")}
                  className={`p-1 rounded-full transition-colors ${votes[i] === "down" ? "text-red-600" : "text-current opacity-40 hover:opacity-70"}`}
                  aria-label="not useful"
                >
                  <ThumbsDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {generatedAt && (
        <p className={`mt-4 text-xs text-rizq-ink-soft/40 ${font}`}>
          {isAr ? `آخر تحديث: ${new Date(generatedAt).toLocaleString("ar-SA")}` : `Last updated: ${new Date(generatedAt).toLocaleString("en-US")}`}
        </p>
      )}
    </div>
  );
}
