"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ThumbsUp, ThumbsDown, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { getBusinessInsightsAction, submitInsightFeedbackAction } from "@/app/actions/dashboard/insights";
import type { InsightsActionResult } from "@/app/actions/dashboard/insights";
import { BusinessInsightsSchema, stripEmDashes } from "@/lib/ai/businessInsights";

/** localStorage key for the collapsed/expanded preference (persists across reloads). */
const COLLAPSE_KEY = "rizq.insights.collapsed";

type Props = { locale: "ar" | "en" };

type InsightItem = {
  ar: string;
  en: string;
  kind: "income" | "client" | "proposal" | "deadline" | "general";
};

/** Small kind dot so the consolidated banner stays one surface (no per-insight
 *  colored boxes) while still hinting the category at a glance. */
const kindDot: Record<InsightItem["kind"], string> = {
  income: "bg-emerald-500",
  client: "bg-blue-500",
  proposal: "bg-amber-500",
  deadline: "bg-red-500",
  general: "bg-rizq-gold",
};

/** Defensively sanitize AI text before display (belt-and-suspenders; the route
 * already strips em dashes on persist, but partial stream chunks bypass that). */
function cleanInsight(i: Partial<InsightItem> | undefined): InsightItem | null {
  if (!i) return null;
  const ar = typeof i.ar === "string" ? stripEmDashes(i.ar, "ar") : "";
  const en = typeof i.en === "string" ? stripEmDashes(i.en, "en") : "";
  if (!ar && !en) return null;
  return { ar, en, kind: i.kind ?? "general" };
}

export function InsightsWidget({ locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [status, setStatus] = useState<"loading" | "ok" | "error" | "empty">("loading");
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [source, setSource] = useState<"ai" | "summary">("ai");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [votes, setVotes] = useState<Record<number, "up" | "down">>({});
  const [refreshing, setRefreshing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const collapseMounted = useRef(false);

  // Streaming state. When `streaming` is true the cards render from the live
  // `object.insights` partial; otherwise from committed `insights` state.
  const [streaming, setStreaming] = useState(false);
  const sawLoadingRef = useRef(false);

  // Restore the collapsed preference once on mount.
  useEffect(() => {
    if (collapseMounted.current) return;
    collapseMounted.current = true;
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "true") setCollapsed(true);
    } catch {
      /* localStorage may be blocked */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });

  // ---------------------------------------------------------------------------
  // Non-stream fallback path (deterministic summary or cached AI).
  // Mirrors the previous behaviour: read cache / aggregate / AI-or-summary.
  // ---------------------------------------------------------------------------
  const loadFromAction = useCallback(async (refresh = false) => {
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
      setSource(res.source ?? "ai");
      setGeneratedAt(res.generated_at);
      setCached(res.cached);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Streaming path — token-by-token via /api/dashboard/insights/draft.
  // ---------------------------------------------------------------------------
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/dashboard/insights/draft",
    schema: BusinessInsightsSchema,
  });

  const startStream = useCallback(() => {
    sawLoadingRef.current = false;
    setStreaming(true);
    setStatus("ok");
    setCached(false);
    setSource("ai");
    setVotes({});
    submit({});
    // submit is stable for the hook's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort any in-flight stream on unmount.
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Settle the stream: on the loading falling-edge OR on error.
  useEffect(() => {
    if (!streaming) return;
    if (isLoading) {
      sawLoadingRef.current = true;
      return;
    }
    if (!sawLoadingRef.current && !error) return; // stream not started yet

    const streamed = (object?.insights ?? [])
      .map((i) => cleanInsight(i as Partial<InsightItem>))
      .filter((i): i is InsightItem => i !== null);

    setStreaming(false);
    setRefreshing(false);

    if (error || streamed.length === 0) {
      // ai_unconfigured / no_data / network error → deterministic-summary fallback.
      // (Force a refresh so a stale empty cache doesn't mask fresh data.)
      void loadFromAction(true);
      return;
    }

    // Settle into the final streamed list. The route persisted these to the
    // cache in onFinish, so the next plain load returns cached:true.
    setInsights(streamed);
    setSource("ai");
    setGeneratedAt(new Date().toISOString());
    setStatus("ok");
  }, [streaming, isLoading, error, object, loadFromAction]);

  // ---------------------------------------------------------------------------
  // Initial load: instant cached path, else stream.
  // ---------------------------------------------------------------------------
  const initialLoad = useCallback(async () => {
    setStatus("loading");
    try {
      const res: InsightsActionResult = await getBusinessInsightsAction();
      if (!res.ok) {
        setStatus("error");
        return;
      }
      // Valid cache → show instantly, no streaming.
      if (res.cached) {
        if (res.empty || res.insights.length === 0) {
          setStatus("empty");
          return;
        }
        setInsights(res.insights as InsightItem[]);
        setSource(res.source ?? "ai");
        setGeneratedAt(res.generated_at);
        setCached(true);
        setStatus("ok");
        return;
      }
      // No valid cache. If the action already produced AI insights (it
      // generated + cached them), just show those; otherwise (summary fallback,
      // or empty) we still want the live experience, so stream.
      if (res.empty || res.insights.length === 0) {
        setStatus("empty");
        return;
      }
      // The action ran with no cache: it either AI-generated (source "ai") or
      // fell back to summary. To deliver the live token-by-token experience we
      // stream a fresh pass; if streaming can't run (no AI / no data) the
      // settle effect falls back to the deterministic summary.
      startStream();
    } catch {
      setStatus("error");
    }
  }, [startStream]);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void initialLoad();
  }, [initialLoad]);

  // Refresh always streams a fresh pass.
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    startStream();
  }, [startStream]);

  const handleVote = async (index: number, vote: "up" | "down") => {
    setVotes((v) => ({ ...v, [index]: vote }));
    await submitInsightFeedbackAction({ index, vote }).catch(() => {});
  };

  // Cards to render: live stream partial while streaming, else committed list.
  const displayInsights: InsightItem[] = streaming
    ? (object?.insights ?? [])
        .map((i) => cleanInsight(i as Partial<InsightItem>))
        .filter((i): i is InsightItem => i !== null)
    : insights;

  // Density: lead with the top 3; the rest are one tap away. Always show all
  // while streaming so the live arrival isn't truncated. (Audit P2.)
  const VISIBLE = 3;
  const canTruncate = !streaming && displayInsights.length > VISIBLE;
  const shownInsights = showAll || !canTruncate ? displayInsights : displayInsights.slice(0, VISIBLE);

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
        <p className={`text-sm text-[var(--over)] ${font}`}>
          {isAr ? "تعذّر تحميل التحليلات. حاول مجددًا." : "Could not load insights. Try again."}
        </p>
        <button
          onClick={() => void loadFromAction()}
          className={`mt-3 text-xs text-rizq-green hover:underline ${font}`}
        >
          {isAr ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  // While streaming, feedback thumbs are hidden until the stream settles (the
  // cache row + indices aren't final yet). AI honesty badge still shows.
  const isStreaming = streaming;

  return (
    <div dir={dir} className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8 col-span-full">
      {/* Header — the title + chevron toggle collapse; state persists. */}
      <div className={`flex items-center justify-between ${collapsed ? "" : "mb-5"} ${font}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="rizq-insights-body"
          className="group -ms-1 flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-rizq-gold/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40"
        >
          <Sparkles className={`h-4 w-4 text-rizq-gold ${isStreaming ? "animate-pulse" : ""}`} />
          <span className={`text-xs font-semibold text-rizq-ink-soft/70 uppercase tracking-wide ${font}`}>
            {isAr ? "تحليل رِزق" : "Rizq Insights"}
          </span>
          {collapsed && displayInsights.length > 0 && (
            <span className="tabular font-sans inline-flex min-w-4 items-center justify-center rounded-full bg-rizq-gold/15 px-1.5 text-[11px] text-rizq-gold-deep">
              {displayInsights.length}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-rizq-ink-soft/50 transition-transform motion-reduce:transition-none ${collapsed ? "" : "rotate-180"}`}
            aria-hidden
          />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2">
            {cached && !isStreaming && (
              <span className={`text-xs text-rizq-ink-soft/50 ${font}`}>
                {isAr ? "محفوظ مؤقتًا" : "Cached"}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || isStreaming}
              className="flex items-center gap-1 text-xs text-rizq-green hover:text-rizq-green-dark transition-colors disabled:opacity-50"
              aria-label={isAr ? "تحديث" : "Refresh"}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing || isStreaming ? "animate-spin" : ""}`} />
              <span className={font}>{isAr ? "تحديث" : "Refresh"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Body — collapses away when toggled shut. One banner: insights are
          compact rows on a single surface, not separate colored cards. */}
      {!collapsed && (
        <div id="rizq-insights-body" className="animate-fade-in motion-reduce:animate-none" aria-live="polite">
          {displayInsights.length > 0 && (
            <ul className="divide-y divide-rizq-gold/15">
              {shownInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kindDot[insight.kind]}`}
                  />
                  <p className={`flex-1 text-sm leading-relaxed text-rizq-ink ${font}`}>
                    {isAr ? insight.ar : insight.en}
                  </p>
                  {source === "ai" && !isStreaming && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleVote(i, "up")}
                        className={`p-1 rounded-full transition-colors ${votes[i] === "up" ? "text-[var(--acc)]" : "text-rizq-ink-soft/40 hover:text-rizq-ink-soft/70"}`}
                        aria-label="useful"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleVote(i, "down")}
                        className={`p-1 rounded-full transition-colors ${votes[i] === "down" ? "text-[var(--over)]" : "text-rizq-ink-soft/40 hover:text-rizq-ink-soft/70"}`}
                        aria-label="not useful"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Live streaming placeholder while the first insight is still arriving. */}
          {isStreaming && displayInsights.length === 0 && (
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-rizq-gold/10 animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-rizq-gold/10 animate-pulse" />
            </div>
          )}

          {/* Show the rest on demand — keeps the dashboard's heaviest block short. */}
          {canTruncate && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className={`mt-3 inline-flex items-center gap-1 text-xs font-medium text-rizq-green hover:text-rizq-green-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 rounded ${font}`}
            >
              {showAll
                ? isAr ? "عرض أقل" : "Show less"
                : isAr ? `عرض الكل (${displayInsights.length})` : `Show all (${displayInsights.length})`}
              <ChevronDown size={13} className={`transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}

          {/* Single honesty + timestamp footer for the whole banner. */}
          <div className={`mt-4 flex items-center justify-between gap-2 ${font}`}>
            <p className={`text-xs text-rizq-ink-soft/50 ${font}`}>
              {source === "ai"
                ? isAr
                  ? "تحليل آلي، ليس استشارة مهنية"
                  : "AI-generated, not professional advice"
                : isAr
                  ? "ملخص محسوب من بياناتك"
                  : "Summary computed from your data"}
            </p>
            {generatedAt && !isStreaming && (
              <p className={`text-xs text-rizq-ink-soft/40 ${font}`}>
                {isAr ? `آخر تحديث: ${new Date(generatedAt).toLocaleString("ar-SA")}` : `Last updated: ${new Date(generatedAt).toLocaleString("en-US")}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
