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
import { Loader2, Copy, Check, Share2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { generateProposal } from "@/app/actions/proposals/generateProposal";
import { answerFollowUps } from "@/app/actions/proposals/answerFollowUps";
import { finalizeProposal } from "@/app/actions/proposals/finalizeProposal";
import { setProposalShare } from "@/app/actions/proposals/shareActions";
import { track } from "@/lib/analytics/track";
import { useRouter } from "@/i18n/navigation";
import { ArtifactSkeleton } from "./ArtifactSkeleton";
import { FollowUpCards } from "./FollowUpCards";
import { ProposalArtifact } from "./ProposalArtifact";
import { StreamingProse } from "./StreamingProse";
import { ToneBar } from "./ToneBar";
import { ScopeInsight } from "./ScopeInsight";
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
  cities: Option[];
  tiers: Option[];
  defaultCitySlug: string;
  templates?: TemplateOption[];
  clients?: ClientOption[];
};

type ViewKind =
  | { kind: "form"; error?: string }
  | { kind: "loading" }
  | { kind: "followups"; proposalId: string; followUps: FollowUpTemplate[]; artifact: ArtifactData }
  // Phase D: pass-1 artifact (templated defaults + real price) is ready; the AI
  // prose stream fills narrative sections live before we land on "artifact".
  | { kind: "drafting"; proposalId: string; baseArtifact: ArtifactData }
  | { kind: "artifact"; proposalId: string; artifact: ArtifactData; finalized: boolean; shareToken?: string }
  | { kind: "quota_exhausted" }
  | { kind: "extraction_failed"; briefText: string }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Copy-link button (mini client island)
// ---------------------------------------------------------------------------

function CopyButton({ text, label, copiedLabel, font }: { text: string; label: string; copiedLabel: string; font: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/80 px-4 py-2 text-sm font-medium text-rizq-ink hover:border-rizq-green/50 transition-all ${font}`}
    >
      {copied ? <Check size={14} className="text-rizq-green" /> : <Copy size={14} />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProposalFlow({ locale, specialties, cities, tiers, defaultCitySlug, templates = [], clients = [] }: Props) {
  const t = useTranslations("Proposals.new");
  const tCommon = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const router = useRouter();

  // Form state
  const [briefText, setBriefText] = useState("");
  const [clientName, setClientName] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [citySlug, setCitySlug] = useState(defaultCitySlug);
  const [tierSlug, setTierSlug] = useState("mid");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Finalize/share transitions
  const [isFinalizing, startFinalizeTransition] = useTransition();
  const [isSharing, startShareTransition] = useTransition();

  // Main flow transition (generate + followups)
  const [isFlowPending, startFlowTransition] = useTransition();

  const [view, setView] = useState<ViewKind>({ kind: "form" });

  // ---------------------------------------------------------------------------
  // Submit handler — generate
  // ---------------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!briefText.trim()) {
      setView({ kind: "form", error: t("errors.briefRequired") });
      return;
    }
    if (!citySlug || !tierSlug) {
      setView({ kind: "form", error: t("errors.selectCityTier") });
      return;
    }
    setView({ kind: "loading" });

    startFlowTransition(async () => {
      const result = await generateProposal({
        brief_text: briefText.trim(),
        // When a known client is selected, pass client_id (client_name resolved server-side)
        // When free-text name is given without a client_id, pass client_name only
        ...(selectedClientId
          ? { client_id: selectedClientId }
          : { client_name: clientName.trim() || undefined }),
        city_slug: citySlug,
        experience_tier_slug: tierSlug,
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
  // Finalize handler
  // ---------------------------------------------------------------------------

  function handleFinalize(proposalId: string) {
    startFinalizeTransition(async () => {
      const result = await finalizeProposal({ proposal_id: proposalId });
      if (!result.ok) return;
      track("proposal_finalized", { locale, proposal_id: proposalId });
      // Land on the full proposal page: per-section refine, rename the project,
      // and export to Word all live there (this flow is just the generate step).
      router.push(`/proposals/${proposalId}` as `/proposals/${string}`);
    });
  }

  /** Open the full proposal page (the edit + export hub) without finalizing. */
  function openFullProposal(proposalId: string) {
    router.push(`/proposals/${proposalId}` as `/proposals/${string}`);
  }

  // ---------------------------------------------------------------------------
  // Share handler
  // ---------------------------------------------------------------------------

  function handleShare(proposalId: string) {
    startShareTransition(async () => {
      const result = await setProposalShare({ proposal_id: proposalId, share: true });
      if (!result.ok) return;
      track("proposal_shared", { locale, proposal_id: proposalId });
      const token = result.token;
      setView((prev) => {
        if (prev.kind === "artifact") return { ...prev, shareToken: token };
        return prev;
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Tone applied
  // ---------------------------------------------------------------------------

  const handleToneApplied = useCallback((artifact: ArtifactData) => {
    setView((prev) => {
      if (prev.kind === "artifact") return { ...prev, artifact };
      return prev;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Drafting complete — land on the artifact. The onFinish DB write is
  // authoritative, so we refresh server data; the artifact we show is the final
  // merged client object (server refresh keeps the proposal detail page in sync).
  // ---------------------------------------------------------------------------

  const handleDraftDone = useCallback(
    (proposalId: string, finalArtifact: ArtifactData) => {
      router.refresh();
      setView({ kind: "artifact", proposalId, artifact: finalArtifact, finalized: false });
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
          className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 text-center ${font}`}
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
        className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 space-y-4 animate-fade-in ${font}`}
      >
        <p className="eyebrow">{t("errors.extractionFailedEyebrow")}</p>
        <h2 className="text-lg font-semibold text-rizq-ink">{t("errors.extractionFailedTitle")}</h2>
        <p className="text-sm text-rizq-ink-soft">{t("errors.extractionFailedBody")}</p>
        {/* Show the original brief back so the user can edit and retry */}
        <textarea
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          rows={5}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 resize-none ${font}`}
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
        className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 text-center animate-fade-in ${font}`}
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

  // ARTIFACT
  if (view.kind === "artifact") {
    const shareUrl =
      view.shareToken
        ? `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/p/${view.shareToken}`
        : null;

    const waUrl = shareUrl
      ? `https://wa.me/?text=${encodeURIComponent(
          isAr
            ? `عرض تقديمي احترافي من رِزق. سعّر بثقة.\n${shareUrl}`
            : `A professional proposal from Rizq. Price with confidence.\n${shareUrl}`
        )}`
      : null;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Artifact */}
        <ProposalArtifact data={view.artifact} locale={locale} />

        {/* AI Affordances */}
        <ToneBar locale={locale} proposalId={view.proposalId} onApplied={handleToneApplied} />
        <ScopeInsight locale={locale} proposalId={view.proposalId} />

        {/* Action row */}
        <div
          dir={dir}
          className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 space-y-4 ${font}`}
        >
          <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase">
            {t("actions")}
          </p>

          <div className="flex flex-wrap gap-3">
            {/* Finalize */}
            {!view.finalized && (
              <button
                type="button"
                onClick={() => handleFinalize(view.proposalId)}
                disabled={isFinalizing}
                className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
              >
                {isFinalizing ? (
                  <><Loader2 size={14} className="animate-spin" /> {t("finalizing")}</>
                ) : (
                  t("finalize")
                )}
              </button>
            )}

            {/* Share */}
            {!view.shareToken && (
              <button
                type="button"
                onClick={() => handleShare(view.proposalId)}
                disabled={isSharing}
                className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-6 py-3 text-sm font-medium hover:bg-rizq-green/8 transition-all disabled:opacity-70 ${font}`}
              >
                {isSharing ? (
                  <><Loader2 size={14} className="animate-spin" /> {t("sharing")}</>
                ) : (
                  <><Share2 size={14} /> {t("share")}</>
                )}
              </button>
            )}

            {/* Open the full proposal: per-section refine, rename, Word export */}
            <button
              type="button"
              onClick={() => openFullProposal(view.proposalId)}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink px-6 py-3 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
            >
              {isAr ? "افتح العرض الكامل (تحرير وتصدير Word)" : "Open full proposal (edit + Word export)"}
            </button>
          </div>

          {/* Share links */}
          {shareUrl && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-rizq-ink-soft">{t("shareNote")}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <CopyButton
                  text={shareUrl}
                  label={t("copyLink")}
                  copiedLabel={t("copied")}
                  font={font}
                />
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity ${font}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                      <path d="M7.5.5A7 7 0 0 0 1.27 10.9L.5 14.5l3.7-.75A7 7 0 1 0 7.5.5zm0 12.73a5.73 5.73 0 0 1-3-.84l-.22-.13-2.2.45.47-2.14-.14-.23A5.75 5.75 0 1 1 7.5 13.23zm3.15-4.3c-.17-.09-1-.5-1.17-.55-.16-.06-.28-.09-.4.09-.12.17-.47.55-.57.66-.1.12-.21.13-.38.05-.17-.09-.73-.27-1.4-.86a5.23 5.23 0 0 1-.97-1.2c-.1-.17-.01-.27.08-.36.08-.08.17-.21.26-.32.09-.1.12-.18.18-.3.06-.12.03-.22-.02-.31-.05-.09-.4-1-.55-1.37-.14-.36-.29-.31-.4-.32H5.38c-.12 0-.3.04-.46.21C4.76 5.07 4.3 5.5 4.3 6.4s.63 1.77.72 1.9c.08.12 1.24 1.88 3 2.64.42.18.75.29 1 .37.42.13.8.11 1.1.07.34-.05 1.04-.42 1.18-.83.15-.41.15-.76.1-.83-.04-.08-.16-.12-.34-.21z" fill="currentColor"/>
                    </svg>
                    {t("whatsapp")}
                  </a>
                )}
              </div>
              {/* Display the URL */}
              <p className="text-xs text-rizq-ink-soft/60 break-all font-sans">{shareUrl}</p>
            </div>
          )}

          {/* New proposal */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setBriefText("");
                setClientName("");
                setGoalsText("");
                setSelectedClientId("");
                setCitySlug(defaultCitySlug);
                setTierSlug("mid");
                setSelectedTemplateId("");
                setView({ kind: "form" });
              }}
              className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
            >
              {t("newProposal")}
            </button>
          </div>
        </div>
      </div>
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
      className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-6 animate-fade-in"
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
          {t("pickClient")}
          <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
        </label>
        <ClientPicker
          id="client-picker"
          value={selectedClientId}
          onChange={(v) => {
            setSelectedClientId(v);
            // When switching to "new client" (cleared), the free-text name field
            // re-appears; when selecting a known client clear any pre-typed name.
            setClientName("");
          }}
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
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors resize-none placeholder:text-rizq-ink-soft/50 ${font}`}
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
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors resize-none placeholder:text-rizq-ink-soft/50 ${font}`}
        />
      </div>

      {/* Client name (optional free-text) — hidden when a known client is selected */}
      {!selectedClientId && (
        <div>
          <label
            htmlFor="client-name"
            className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
          >
            {t("clientNameLabel")}
            <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
          </label>
          <input
            id="client-name"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t("clientNamePlaceholder")}
            className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`}
          />
        </div>
      )}

      {/* City select */}
      <SelectField
        locale={locale}
        id="city"
        label={t("cityLabel")}
        placeholder={t("cityPlaceholder")}
        value={citySlug}
        onChange={setCitySlug}
        options={cities}
      />

      {/* Experience tier select */}
      <SelectField
        locale={locale}
        id="tier"
        label={t("tierLabel")}
        placeholder={t("tierPlaceholder")}
        value={tierSlug}
        onChange={setTierSlug}
        options={tiers}
      />

      {/* Error */}
      {formError && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {formError}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isFlowPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
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
// SelectField (same pattern as ToolFlow)
// ---------------------------------------------------------------------------

function SelectField({
  locale,
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  locale: "ar" | "en";
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  const tCommon = useTranslations("Common");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
      >
        {label}
      </label>
      <Combobox
        id={id}
        locale={locale}
        value={value || null}
        onChange={(v) => onChange(v ?? "")}
        options={options.map((o) => ({ value: o.slug, label: o.label, hint: o.hint }))}
        placeholder={placeholder}
        searchPlaceholder={tCommon("combobox.searchPlaceholder")}
        emptyText={tCommon("combobox.noResults")}
      />
    </div>
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
  onDone: (proposalId: string, finalArtifact: ArtifactData) => void;
  label: string;
}) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const { object, submit, isLoading, error, stop } = useObject({
    api: `/api/proposals/${proposalId}/draft`,
    schema: ProseSchema,
  });

  // Latest merged artifact, kept in a ref so completion uses the freshest data
  // without making the completion effect depend on `object` (which changes on
  // every streamed chunk). The ref is synced in an effect (never during render).
  const liveArtifact = mergeProseIntoArtifact(baseArtifact, object);
  const latestRef = useRef<ArtifactData>(liveArtifact);
  useEffect(() => {
    latestRef.current = liveArtifact;
  }, [liveArtifact]);

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

  // Abort the in-flight request if the user navigates away mid-stream.
  useEffect(() => {
    return () => {
      if (!doneRef.current) stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Complete on the loading falling-edge OR on error. Fire onDone once.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(proposalId, latestRef.current);
  }, [onDone, proposalId]);

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
      {/* Live drafting status */}
      <div
        className={`flex items-center justify-center gap-2 text-sm text-rizq-gold-dark ${font}`}
        aria-live="polite"
      >
        <Sparkles size={15} className="animate-pulse shrink-0" />
        <span>{label}</span>
      </div>

      {/* Artifact, prose sections filling in live */}
      <StreamingProse active={isLoading}>
        <ProposalArtifact data={liveArtifact} locale={locale} />
      </StreamingProse>
    </div>
  );
}
