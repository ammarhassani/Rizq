"use client";

/**
 * SectionEditor — Phase E per-section inline refine control bar.
 *
 * Rendered by ProposalArtifact (owner detail page ONLY — never the public share
 * page) immediately AFTER an editable prose section. Offers three actions on
 * that single section:
 *   - Edit       → inline editor (textarea / repeatable lists) → updateSection
 *   - Regenerate → AI redraft of just this section → regenerateSection
 *   - Tone ▾     → rewrite just this section in a chosen tone → adjustToneAction
 *
 * All three are hidden in print. After any successful mutation we router.refresh()
 * so the server-rendered artifact re-renders with the new content. The price and
 * citation are never touched by any of these.
 */

import { useState, useTransition, useId } from "react";
import {
  PencilLine,
  Sparkles,
  Wand2,
  ChevronDown,
  Loader2,
  X,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  updateSection,
  regenerateSection,
} from "@/app/actions/proposals/updateSection";
import { adjustProposalTone } from "@/app/actions/proposals/adjustToneAction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionId =
  | "cover_letter"
  | "understanding"
  | "approach"
  | "scope_of_work"
  | "assumptions";

type Props = {
  proposalId: string;
  sectionId: SectionId;
  locale: "ar" | "en";
  content: Record<string, unknown>;
};

type Tone = "formal" | "balanced" | "friendly" | "persuasive";

const TONES: Tone[] = ["formal", "balanced", "friendly", "persuasive"];

// ---------------------------------------------------------------------------
// Content parsing helpers (defensive — artifact content is untyped jsonb)
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(asString) : [];
}

function asPhases(v: unknown): { title: string; body: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({ title: asString(p["title"]), body: asString(p["body"]) }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionEditor({ proposalId, sectionId, locale, content }: Props) {
  const t = useTranslations("Proposals.refine");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const uid = useId();

  // UI mode
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [toneOpen, setToneOpen] = useState(false);

  // Feedback
  const [note, setNote] = useState<{ kind: "ok" | "error" | "ai"; text: string } | null>(
    null
  );

  const [isPending, startTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Editable field state (seeded from content; re-seeded each time Edit opens)
  // -------------------------------------------------------------------------
  const [body, setBody] = useState(() => asString(content["body"]));
  const [phases, setPhases] = useState(() => asPhases(content["phases"]));
  const deliverables = asStringArray(content["deliverables"]);
  const [descriptions, setDescriptions] = useState<string[]>(() => {
    const existing = asStringArray(content["deliverable_descriptions"]);
    // One input per deliverable, index-aligned.
    return deliverables.map((_, i) => existing[i] ?? "");
  });
  const [assumptions, setAssumptions] = useState<string[]>(() =>
    asStringArray(content["assumptions"])
  );
  const [exclusions, setExclusions] = useState<string[]>(() =>
    asStringArray(content["exclusions"])
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function openEdit() {
    // Re-seed from current content so reopening after a refresh shows fresh data.
    setBody(asString(content["body"]));
    setPhases(asPhases(content["phases"]));
    const existing = asStringArray(content["deliverable_descriptions"]);
    setDescriptions(deliverables.map((_, i) => existing[i] ?? ""));
    setAssumptions(asStringArray(content["assumptions"]));
    setExclusions(asStringArray(content["exclusions"]));
    setNote(null);
    setToneOpen(false);
    setMode("editing");
  }

  function cancelEdit() {
    setMode("idle");
    setNote(null);
  }

  function buildContent():
    | { body: string }
    | { phases: { title: string; body: string }[] }
    | { deliverable_descriptions: string[] }
    | { assumptions: string[]; exclusions: string[] } {
    switch (sectionId) {
      case "cover_letter":
      case "understanding":
        return { body };
      case "approach":
        return {
          phases: phases
            .map((p) => ({ title: p.title.trim(), body: p.body.trim() }))
            .filter((p) => p.title.length > 0 || p.body.length > 0),
        };
      case "scope_of_work":
        return { deliverable_descriptions: descriptions.map((d) => d.trim()) };
      case "assumptions":
        return {
          assumptions: assumptions.map((a) => a.trim()).filter(Boolean),
          exclusions: exclusions.map((e) => e.trim()).filter(Boolean),
        };
    }
  }

  function handleSave() {
    startTransition(async () => {
      setNote(null);
      const result = await updateSection({
        proposal_id: proposalId,
        section_id: sectionId,
        content: buildContent(),
      });
      if (result.ok) {
        setMode("idle");
        setNote({ kind: "ok", text: t("saved") });
        router.refresh();
      } else {
        setNote({ kind: "error", text: t("genericError") });
      }
    });
  }

  function handleRegenerate() {
    if (isPending) return;
    setToneOpen(false);
    startTransition(async () => {
      setNote(null);
      const result = await regenerateSection({
        proposal_id: proposalId,
        section_id: sectionId,
      });
      if (result.ok) {
        setNote({ kind: "ok", text: t("saved") });
        router.refresh();
      } else if (result.code === "ai_unconfigured") {
        setNote({ kind: "ai", text: t("aiUnavailable") });
      } else {
        setNote({ kind: "error", text: t("genericError") });
      }
    });
  }

  function handleTone(tone: Tone) {
    setToneOpen(false);
    startTransition(async () => {
      setNote(null);
      const result = await adjustProposalTone({
        proposal_id: proposalId,
        tone,
        section_id: sectionId,
      });
      if (result.ok) {
        setNote({ kind: "ok", text: t("saved") });
        router.refresh();
      } else {
        setNote({ kind: "error", text: t("genericError") });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Styling primitives
  // -------------------------------------------------------------------------
  const btnBase =
    "inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-white/70 px-4 py-2 text-sm font-medium text-rizq-ink min-h-[40px] transition-all hover:border-rizq-green/50 hover:bg-rizq-green/8 disabled:opacity-60 disabled:hover:bg-white/70";
  const inputBase = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-2 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 transition-colors disabled:opacity-60 ${font}`;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div dir={dir} className={`print:hidden mt-2 ${font}`}>
      {/* Control bar */}
      {mode === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openEdit} disabled={isPending} className={btnBase}>
            <PencilLine size={14} className="shrink-0" />
            {t("edit")}
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            className={btnBase}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin shrink-0" />
            ) : (
              <Sparkles size={14} className="shrink-0" />
            )}
            {isPending ? t("regenerating") : t("regenerate")}
          </button>

          {/* Tone dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setToneOpen((v) => !v)}
              disabled={isPending}
              aria-haspopup="menu"
              aria-expanded={toneOpen}
              className={btnBase}
            >
              <Wand2 size={14} className="shrink-0" />
              {t("tone")}
              <ChevronDown size={13} className="shrink-0 opacity-70" />
            </button>

            {toneOpen && (
              <div
                role="menu"
                aria-label={t("tone")}
                className="absolute z-20 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-rizq-gold/25 bg-white shadow-lg"
              >
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    role="menuitem"
                    onClick={() => handleTone(tone)}
                    disabled={isPending}
                    className={`block w-full px-4 py-2.5 text-start text-sm text-rizq-ink min-h-[40px] hover:bg-rizq-green/8 disabled:opacity-60 ${font}`}
                  >
                    {t(`tone_${tone}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline editor */}
      {mode === "editing" && (
        <div className="rounded-2xl border border-rizq-green/20 bg-white/80 p-4 space-y-4 shadow-sm">
          {/* Body sections */}
          {(sectionId === "cover_letter" || sectionId === "understanding") && (
            <textarea
              id={`${uid}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              disabled={isPending}
              className={`${inputBase} resize-none`}
            />
          )}

          {/* Approach phases */}
          {sectionId === "approach" && (
            <div className="space-y-3">
              {phases.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-rizq-gold/20 bg-rizq-cream/40 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-rizq-gold-dark">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => setPhases((ps) => ps.filter((_, j) => j !== i))}
                      disabled={isPending}
                      aria-label={t("remove")}
                      className="text-rizq-ink-soft hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={p.title}
                    placeholder={t("phaseTitle")}
                    onChange={(e) =>
                      setPhases((ps) =>
                        ps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                      )
                    }
                    disabled={isPending}
                    className={inputBase}
                  />
                  <textarea
                    value={p.body}
                    placeholder={t("phaseBody")}
                    rows={2}
                    onChange={(e) =>
                      setPhases((ps) =>
                        ps.map((x, j) => (j === i ? { ...x, body: e.target.value } : x))
                      )
                    }
                    disabled={isPending}
                    className={`${inputBase} resize-none`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPhases((ps) => [...ps, { title: "", body: "" }])}
                disabled={isPending}
                className={`${btnBase} text-xs`}
              >
                <Plus size={13} className="shrink-0" />
                {t("addPhase")}
              </button>
            </div>
          )}

          {/* Scope: one description per deliverable */}
          {sectionId === "scope_of_work" && (
            <div className="space-y-3">
              {deliverables.length === 0 && (
                <p className="text-xs text-rizq-ink-soft">{t("noDeliverables")}</p>
              )}
              {deliverables.map((d, i) => (
                <div key={i} className="space-y-1">
                  <label
                    htmlFor={`${uid}-desc-${i}`}
                    className="block text-xs font-medium text-rizq-ink"
                  >
                    {d}
                  </label>
                  <input
                    id={`${uid}-desc-${i}`}
                    type="text"
                    value={descriptions[i] ?? ""}
                    placeholder={t("deliverableDescription")}
                    onChange={(e) =>
                      setDescriptions((ds) =>
                        ds.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                    disabled={isPending}
                    className={inputBase}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Assumptions + exclusions: two lists */}
          {sectionId === "assumptions" && (
            <div className="space-y-4">
              <ListEditor
                label={t("assumptions")}
                addLabel={t("addAssumption")}
                removeLabel={t("remove")}
                items={assumptions}
                setItems={setAssumptions}
                disabled={isPending}
                inputClass={inputBase}
                btnClass={`${btnBase} text-xs`}
              />
              <ListEditor
                label={t("exclusions")}
                addLabel={t("addExclusion")}
                removeLabel={t("remove")}
                items={exclusions}
                setItems={setExclusions}
                disabled={isPending}
                inputClass={inputBase}
                btnClass={`${btnBase} text-xs`}
              />
            </div>
          )}

          {/* Save / cancel */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium min-h-[40px] hover:bg-rizq-green-dark transition-all disabled:opacity-70"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin shrink-0" />
              ) : (
                <Check size={14} className="shrink-0" />
              )}
              {isPending ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors disabled:opacity-50"
            >
              <X size={14} className="shrink-0" />
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Inline note (saved / error / AI unavailable) */}
      {note && (
        <p
          role={note.kind === "error" ? "alert" : "status"}
          className={`mt-2 inline-flex items-center gap-1.5 text-xs ${
            note.kind === "ok"
              ? "text-rizq-green"
              : note.kind === "ai"
                ? "text-rizq-gold-dark"
                : "text-red-600"
          } ${font}`}
        >
          {note.kind === "ok" && <Check size={12} className="shrink-0" />}
          {note.text}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small repeatable string-list editor (assumptions / exclusions)
// ---------------------------------------------------------------------------

function ListEditor({
  label,
  addLabel,
  removeLabel,
  items,
  setItems,
  disabled,
  inputClass,
  btnClass,
}: {
  label: string;
  addLabel: string;
  removeLabel: string;
  items: string[];
  setItems: React.Dispatch<React.SetStateAction<string[]>>;
  disabled: boolean;
  inputClass: string;
  btnClass: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark">
        {label}
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) =>
              setItems((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))
            }
            disabled={disabled}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
            disabled={disabled}
            aria-label={removeLabel}
            className="shrink-0 text-rizq-ink-soft hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems((xs) => [...xs, ""])}
        disabled={disabled}
        className={btnClass}
      >
        <Plus size={13} className="shrink-0" />
        {addLabel}
      </button>
    </div>
  );
}
