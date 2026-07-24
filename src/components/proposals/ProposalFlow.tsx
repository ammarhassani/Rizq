"use client";

/**
 * ProposalFlow — the core generate-flow orchestrator.
 * Phase-2 task 2.9.
 *
 * State machine: form → loading → followups → artifact | error
 *
 * Props are loaded server-side (specialties/cities/tiers) and passed down.
 * All server actions are called via useTransition.
 */

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { generateProposal } from "@/app/actions/proposals/generateProposal";
import { answerFollowUps } from "@/app/actions/proposals/answerFollowUps";
import { linkProposalToProject } from "@/app/actions/projects/linkProposalToProject";
import { track } from "@/lib/analytics/track";
import { useRouter } from "@/i18n/navigation";
import { ArtifactSkeleton } from "./ArtifactSkeleton";
import { FollowUpCards } from "./FollowUpCards";
import { ProposalArtifact } from "./ProposalArtifact";
import { StreamingProse } from "./StreamingProse";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { Combobox } from "@/components/ui/Combobox";
import { ProseSchema, mergeProseIntoArtifact } from "@/lib/ai/proseDraft";
import type { ArtifactData } from "@/lib/proposals/artifact";
import type { FollowUpTemplate } from "@/lib/proposals/followUp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Option = { slug: string; label: string; hint?: string };

type TemplateOption = { id: string; name_ar: string; name_en: string | null };

type ClientOption = { id: string; name: string };

type Props = {
  locale: "ar" | "en";
  specialties: Option[];
  templates?: TemplateOption[];
  clients?: ClientOption[];
  /** Guided flow: when set, the generated proposal is linked back to this
   *  existing project as its origin (backfilling a skipped proposal step). */
  forProjectId?: string;
};

type ViewKind =
  | { kind: "form"; error?: string }
  | { kind: "loading" }
  | { kind: "followups"; proposalId: string; followUps: FollowUpTemplate[]; artifact: ArtifactData }
  // Phase D: pass-1 artifact (templated defaults + real price) is ready; the AI
  // prose stream fills narrative sections live, then we navigate to the detail
  // page (the single edit + deliver hub) — there is no separate preview step.
  | { kind: "drafting"; proposalId: string; baseArtifact: ArtifactData }
  | { kind: "quota_exhausted" }
  | { kind: "extraction_failed"; briefText: string }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProposalFlow({ locale, specialties, templates = [], clients = [], forProjectId }: Props) {
  const t = useTranslations("Proposals.new");
  const tCommon = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const router = useRouter();

  // Form state
  const [briefText, setBriefText] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Main flow transition (generate + followups)
  const [isFlowPending, startFlowTransition] = useTransition();

  const [view, setView] = useState<ViewKind>({ kind: "form" });

  // ---------------------------------------------------------------------------
  // Submit handler — generate
  // ---------------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    // Defense-in-depth: ignore submit events that bubbled up from a nested or
    // portaled child form (the client "+ Add" dialog). React bubbles submit
    // events through the component tree including portals, so without this a
    // dialog submit would also fire generateProposal (phantom submit). Only
    // this form's own submit should generate a proposal.
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    if (!briefText.trim()) {
      setView({ kind: "form", error: t("errors.briefRequired") });
      return;
    }
    if (!selectedClientId) {
      setView({
        kind: "form",
        error: isAr ? "اختر عميلاً أو أضِف عميلاً جديدًا." : "Select a client, or add a new one.",
      });
      return;
    }
    setView({ kind: "loading" });

    startFlowTransition(async () => {
      const result = await generateProposal({
        brief_text: briefText.trim(),
        // Client is mandatory — always a real client from the book (client_name
        // is resolved server-side from the id). City + experience tier are
        // resolved server-side (client city + the freelancer's profile).
        client_id: selectedClientId,
        template_id: selectedTemplateId || undefined,
        project_goals: goalsText.trim() || undefined,
      });

      if (!result.ok) {
        if (result.code === "extraction_failed") {
          track("proposal_extraction_failed", { locale });
          setView({ kind: "extraction_failed", briefText: briefText.trim() });
          return;
        }
        if (result.code === "quota_exhausted") {
          track("quota_exhausted", { locale, flow: "proposals" });
          setView({ kind: "quota_exhausted" });
          return;
        }
        track("proposal_generate_error", { locale, code: result.code });
        setView({ kind: "error", message: t("errors.generic") });
        return;
      }

      track("proposal_generated", {
        locale,
        proposal_id: result.proposal_id,
        has_follow_ups: result.follow_ups.length > 0,
        confidence: result.confidence,
        price_anchor: result.price.anchor,
      });

      // Guided flow: backfill this proposal as the origin of the project whose
      // proposal step was skipped (best-effort; doesn't block the draft flow).
      if (forProjectId) {
        linkProposalToProject({ proposal_id: result.proposal_id, project_id: forProjectId }).catch(() => {});
      }

      if (result.follow_ups.length > 0) {
        setView({
          kind: "followups",
          proposalId: result.proposal_id,
          followUps: result.follow_ups,
          artifact: result.artifact_json,
        });
        return;
      }

      // No follow-ups: scope is final → kick off the live prose pass.
      setView({
        kind: "drafting",
        proposalId: result.proposal_id,
        baseArtifact: result.artifact_json,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Follow-up submit handler
  // ---------------------------------------------------------------------------

  const handleFollowUpSubmit = useCallback(
    (proposalId: string, answers: Record<string, unknown>) => {
      startFlowTransition(async () => {
        const result = await answerFollowUps({ proposal_id: proposalId, answers });
        if (!result.ok) {
          setView({ kind: "error", message: t("errors.generic") });
          return;
        }
        track("proposal_followups_answered", { locale, proposal_id: proposalId });
        // Scope is now final → run the live prose pass before the artifact.
        setView({ kind: "drafting", proposalId, baseArtifact: result.artifact_json });
      });
    },
    [locale, t]
  );

  // ---------------------------------------------------------------------------
  // Drafting complete — navigate to the proposal detail page (the single edit +
  // deliver hub). The AI SDK awaits onFinish (the DB write) before the stream
  // closes, so the persisted prose is already in place when we land there.
  // ---------------------------------------------------------------------------

  const handleDraftDone = useCallback(
    (proposalId: string) => {
      router.push(`/proposals/${proposalId}` as `/proposals/${string}`);
    },
    [router]
  );

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  // LOADING
  if (view.kind === "loading") {
    return <ArtifactSkeleton locale={locale} activeStep={0} />;
  }

  // QUOTA EXHAUSTED — show the reusable upgrade modal + fallback form
  if (view.kind === "quota_exhausted") {
    return (
      <>
        <UpgradeModal
          open
          onClose={() => setView({ kind: "form" })}
          locale={locale}
          reason="proposals"
        />
        {/* Invisible placeholder so layout doesn't collapse behind the modal */}
        <div
          dir={dir}
          className={`card-wahaj p-8 text-center ${font}`}
          aria-hidden="true"
        />
      </>
    );
  }

  // EXTRACTION FAILED
  if (view.kind === "extraction_failed") {
    return (
      <div
        dir={dir}
        className={`card-wahaj p-8 space-y-4 animate-fade-in ${font}`}
      >
        <p className="eyebrow">{t("errors.extractionFailedEyebrow")}</p>
        <h2 className="text-lg font-semibold text-rizq-ink">{t("errors.extractionFailedTitle")}</h2>
        <p className="text-sm text-rizq-ink-soft">{t("errors.extractionFailedBody")}</p>
        {/* Show the original brief back so the user can edit and retry */}
        <textarea
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          rows={5}
          className={`w-full rounded-xl nm-inset bg-[var(--raised)] px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 resize-none ${font}`}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setView({ kind: "form" });
              // Keep the edited brief text
            }}
            className={`inline-flex items-center rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-all ${font}`}
          >
            {t("errors.extractionRetry")}
          </button>
          <button
            type="button"
            onClick={() => setView({ kind: "form" })}
            className="text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors"
          >
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  // GENERIC ERROR
  if (view.kind === "error") {
    return (
      <div
        dir={dir}
        className={`card-wahaj p-8 text-center animate-fade-in ${font}`}
      >
        <p className="text-sm text-rizq-ink-soft mb-4">{view.message}</p>
        <button
          type="button"
          onClick={() => setView({ kind: "form" })}
          className={`inline-flex items-center rounded-full bg-rizq-green text-rizq-cream px-7 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-all ${font}`}
        >
          {t("back")}
        </button>
      </div>
    );
  }

  // FOLLOW-UPS
  if (view.kind === "followups") {
    return (
      <FollowUpCards
        locale={locale}
        questions={view.followUps}
        onSubmit={(answers) => handleFollowUpSubmit(view.proposalId, answers)}
        onSkip={() =>
          setView({ kind: "drafting", proposalId: view.proposalId, baseArtifact: view.artifact })
        }
        pending={isFlowPending}
      />
    );
  }

  // DRAFTING — live AI prose stream fills the artifact's narrative sections.
  if (view.kind === "drafting") {
    return (
      <DraftingView
        key={view.proposalId}
        locale={locale}
        proposalId={view.proposalId}
        baseArtifact={view.baseArtifact}
        onDone={handleDraftDone}
        label={t("drafting")}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // FORM
  // ---------------------------------------------------------------------------

  const formError = view.kind === "form" ? view.error : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      dir={dir}
      className="nm-raised rounded-[22px] bg-[var(--raised)] p-7 sm:p-10 space-y-6 animate-fade-in"
      noValidate
    >
      {/* Template picker — only shown when the owner has saved templates */}
      {templates.length > 0 && (
        <div>
          <label
            htmlFor="template"
            className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
          >
            {t("templatePicker")}
          </label>
          <Combobox
            id="template"
            aria-label={t("templatePicker")}
            locale={locale}
            value={selectedTemplateId || null}
            onChange={(v) => setSelectedTemplateId(v ?? "")}
            options={templates.map((tpl) => ({
              value: tpl.id,
              label: isAr ? tpl.name_ar : (tpl.name_en ?? tpl.name_ar),
            }))}
            placeholder={t("templatePickerNone")}
            searchPlaceholder={tCommon("combobox.searchPlaceholder")}
            emptyText={tCommon("combobox.noResults")}
            allowClear
          />
        </div>
      )}

      {/* Client picker — combobox + quick-add */}
      <div>
        <label
          htmlFor="client-picker"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("pickClient")} <span className="text-[var(--over)]">*</span>
        </label>
        <ClientPicker
          id="client-picker"
          value={selectedClientId}
          onChange={(v) => setSelectedClientId(v)}
          clients={clients}
          locale={locale}
          noneLabel={t("newClient")}
        />
      </div>

      {/* Brief textarea */}
      <div>
        <label
          htmlFor="brief"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("briefLabel")}
        </label>
        <textarea
          id="brief"
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          rows={6}
          placeholder={t("briefPlaceholder")}
          className={`w-full rounded-xl nm-inset bg-[var(--raised)] px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream transition-colors resize-none placeholder:text-rizq-ink-soft/50 ${font}`}
        />
      </div>

      {/* Project goals (optional, secondary) — grounds the AI prose pass. */}
      <div>
        <label
          htmlFor="goals"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("goalsLabel")}
          <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
        </label>
        <textarea
          id="goals"
          value={goalsText}
          onChange={(e) => setGoalsText(e.target.value)}
          rows={2}
          placeholder={t("goalsPlaceholder")}
          className={`w-full rounded-xl nm-inset bg-[var(--raised)] px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream transition-colors resize-none placeholder:text-rizq-ink-soft/50 ${font}`}
        />
      </div>


      {/* Error */}
      {formError && (
        <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
          {formError}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isFlowPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full aurora-btn px-7 py-4 text-base font-medium tracking-wide hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isFlowPending ? (
          <>
            <Loader2 size={18} className="animate-spin" strokeWidth={2.2} />
            <span>{t("submitting")}</span>
          </>
        ) : (
          <>
            <span>{t("submit")}</span>
            <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              →
            </span>
          </>
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// DraftingView — owns the streaming `useObject` hook (Phase D).
// ---------------------------------------------------------------------------
//
// Mounted only while in the "drafting" state, keyed by proposalId so the hook
// resets per proposal. On mount it submits to /api/proposals/[id]/draft and
// renders the artifact live as the prose partial streams in. On completion (or
// any error / ai_unconfigured), it hands the freshest merged artifact back to
// the parent, which refreshes server data and lands on the artifact view.
//
// Graceful degrade: if the route returns ai_unconfigured (200 JSON, not a
// schema stream) or errors/times out, useObject's onError fires (or the stream
// finishes with no object); either way we fall through to the artifact with
// templated defaults, no scary error (matches the dashboard insights pattern).

function DraftingView({
  locale,
  proposalId,
  baseArtifact,
  onDone,
  label,
}: {
  locale: "ar" | "en";
  proposalId: string;
  baseArtifact: ArtifactData;
  onDone: (proposalId: string) => void;
  label: string;
}) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const { object, submit, isLoading, error, stop } = useObject({
    api: `/api/proposals/${proposalId}/draft`,
    schema: ProseSchema,
  });

  // The artifact rendered live as prose streams in. The final merged object is
  // persisted server-side in the route's onFinish (the source of truth); when
  // the stream closes we navigate to the detail page, which reads it back.
  const liveArtifact = mergeProseIntoArtifact(baseArtifact, object);

  // Kick off the stream exactly once on mount.
  const startedRef = useRef(false);
  const sawLoadingRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track("proposal_draft_started", { locale, proposal_id: proposalId });
    submit({});
    // submit is stable for the hook's lifetime; intentionally run-once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: we deliberately do NOT abort the stream on unmount. React StrictMode
  // (on in dev) double-invokes effects — an abort-on-unmount cleanup fired
  // during the transient unmount and, combined with the run-once `startedRef`
  // guard, killed the request before it was sent (the draft POST never reached
  // the server → stuck on "writing…"). The stream is short and the server's
  // onFinish persists regardless, so letting it run to completion is safe.

  // Complete on the loading falling-edge OR on error. Fire onDone once.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(proposalId);
  }, [onDone, proposalId]);

  // Watchdog: never let the drafting view hang. If the stream hasn't completed
  // shortly after the server's 45s abort window, stop and move on to the detail
  // page (which renders whatever prose persisted + templated defaults).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current) {
        try { stop(); } catch { /* ignore */ }
        finish();
      }
    }, 55_000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoading) {
      sawLoadingRef.current = true;
      return;
    }
    // Not loading. Complete once we've either seen a loading cycle finish or
    // hit an error (covers ai_unconfigured / network failure before streaming).
    if (sawLoadingRef.current || error) {
      track("proposal_draft_done", {
        locale,
        proposal_id: proposalId,
        had_error: error != null,
      });
      finish();
    }
  }, [isLoading, error, finish, locale, proposalId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live drafting status — the generation "moment" (audit §O1) */}
      <div
        className={`flex items-center justify-center gap-2 text-sm font-medium ${font}`}
        aria-live="polite"
      >
        <Sparkles size={15} className="animate-pulse shrink-0 text-[var(--acc)]" />
        <span className="aurora-text-m">{label}</span>
      </div>

      {/* Aurora rotating border frames the GENERATION only — DraftingView unmounts
          on done, so the persisted, client-facing artifact stays sober (no glow). */}
      <div className="aurora-ring">
        <div className="rounded-[20px] bg-[var(--raised)] p-4 sm:p-6">
          <StreamingProse active={isLoading}>
            <ProposalArtifact data={liveArtifact} locale={locale} />
          </StreamingProse>
        </div>
      </div>
    </div>
  );
}
