"use client";

/**
 * EditProposalForm — inline collapsible edit form for final/sent proposals.
 * Phase-2: wires the previously-unreachable editProposal server action.
 *
 * Props are seeded from the proposal detail page (scope_json + price fields).
 * On success: router.refresh() + collapses the form + shows "saved (v{n})".
 */

import { useState, useTransition } from "react";
import { Loader2, PencilLine, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { editProposal } from "@/app/actions/proposals/editProposal";
import { track } from "@/lib/analytics/track";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type EditProposalFormProps = {
  locale: "ar" | "en";
  proposalId: string;
  initialDescription: string;
  initialDeliverables: string[];
  initialAnchor: number;
  priceMin: number;
  priceMax: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditProposalForm({
  locale,
  proposalId,
  initialDescription,
  initialDeliverables,
  initialAnchor,
  priceMin,
  priceMax,
}: EditProposalFormProps) {
  const t = useTranslations("Proposals.detail.edit");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Collapse / expand state
  const [open, setOpen] = useState(false);

  // Field state
  const [deliverables, setDeliverables] = useState(
    initialDeliverables.join("\n")
  );
  const [description, setDescription] = useState(initialDescription);
  const [anchor, setAnchor] = useState(initialAnchor);

  // Result banner
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpen() {
    // Reset fields to initial values on re-open
    setDeliverables(initialDeliverables.join("\n"));
    setDescription(initialDescription);
    setAnchor(initialAnchor);
    setErrorMsg(null);
    setSavedVersion(null);
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
    setErrorMsg(null);
  }

  function handleAnchorBlur() {
    // Client-side clamp on blur
    setAnchor((v) => Math.max(priceMin, Math.min(priceMax, v)));
  }

  function handleSave() {
    const deliverableLines = deliverables
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    startTransition(async () => {
      setErrorMsg(null);
      const result = await editProposal({
        proposal_id: proposalId,
        scope_patch: {
          deliverables: deliverableLines,
          // Store description in extras so it survives future edits
          extras: { description: description.trim() || null },
        },
        price_anchor: anchor,
      });

      if (result.ok) {
        track("proposal_edited", { version: result.version, locale });
        setSavedVersion(result.version);
        setOpen(false);
        router.refresh();
      } else {
        // Surface a user-facing error without crashing
        setErrorMsg(
          isAr
            ? "تعذّر حفظ التعديلات. حاول مرة أخرى."
            : "Failed to save changes. Please try again."
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render — trigger button when closed, inline form when open
  // ---------------------------------------------------------------------------

  return (
    <div dir={dir} className={font}>
      {/* Trigger button */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/30 bg-rizq-green/5 text-rizq-green px-6 py-3 text-sm font-medium hover:bg-rizq-green/12 hover:-translate-y-0.5 transition-all ${font}`}
        >
          <PencilLine size={14} />
          {t("edit")}
        </button>
      )}

      {/* Saved banner (shown when form closed after success) */}
      {!open && savedVersion !== null && (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border border-rizq-green/20 bg-rizq-green/8 px-4 py-2 text-xs font-medium text-rizq-green ${font}`}
        >
          <Check size={12} />
          {t("savedAs", { n: savedVersion })}
        </div>
      )}

      {/* Inline form */}
      {open && (
        <div
          className={`rounded-2xl border border-rizq-green/20 bg-[var(--raised)] backdrop-blur-sm p-5 space-y-5 animate-fade-in shadow-sm ${font}`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase">
              {t("edit")}
            </p>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              aria-label={t("cancel")}
              className="text-rizq-ink-soft hover:text-rizq-ink transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Deliverables */}
          <div className="space-y-1.5">
            <label
              htmlFor={`edit-deliverables-${proposalId}`}
              className={`block text-sm font-medium text-rizq-ink ${font}`}
            >
              {t("deliverables")}
            </label>
            <textarea
              id={`edit-deliverables-${proposalId}`}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              rows={4}
              disabled={isPending}
              className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 resize-none transition-colors disabled:opacity-60 ${font}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor={`edit-description-${proposalId}`}
              className={`block text-sm font-medium text-rizq-ink ${font}`}
            >
              {t("description")}
            </label>
            <textarea
              id={`edit-description-${proposalId}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isPending}
              className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 resize-none transition-colors disabled:opacity-60 ${font}`}
            />
          </div>

          {/* Price anchor */}
          <div className="space-y-1.5">
            <label
              htmlFor={`edit-anchor-${proposalId}`}
              className={`block text-sm font-medium text-rizq-ink ${font}`}
            >
              {t("recommendedPrice")}
            </label>
            <input
              id={`edit-anchor-${proposalId}`}
              type="number"
              min={priceMin}
              max={priceMax}
              step={50}
              value={anchor}
              onChange={(e) => setAnchor(Number(e.target.value))}
              onBlur={handleAnchorBlur}
              disabled={isPending}
              className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 tabular transition-colors disabled:opacity-60 font-sans`}
            />
            <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>
              {t("priceRange", {
                min: priceMin.toLocaleString(),
                max: priceMax.toLocaleString(),
              })}
            </p>
          </div>

          {/* Error */}
          {errorMsg && (
            <p
              role="alert"
              className={`text-sm text-[var(--over)] ${font}`}
            >
              {errorMsg}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("saveChanges")
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors disabled:opacity-50 ${font}`}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
