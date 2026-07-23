"use client";

/**
 * PDPL Phase 6.11 — Settings client island.
 * Handles:
 *  - "Export my data" button → calls exportMyDataAction → triggers JSON download
 *  - "Delete account" → confirm dialog (typed phrase) → deleteMyAccountAction → signOut + redirect
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Download,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { exportMyDataAction } from "@/app/actions/account/dataExport";
import { deleteMyAccountAction } from "@/app/actions/account/deleteAccount";
import { Link } from "@/i18n/navigation";

type Props = {
  locale: "ar" | "en";
  /** Expected phrase displayed in the UI (depends on locale). */
  confirmPhrase: string;
};

// ── Export section ────────────────────────────────────────────────────────────

function ExportSection({ locale, font }: { locale: "ar" | "en"; font: string }) {
  const t = useTranslations("Settings");
  const [isPending, startTransition] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  function triggerDownload(json: string, filename: string) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    setExportError(null);
    startTransition(async () => {
      const result = await exportMyDataAction();
      if (result.ok) {
        triggerDownload(result.json, result.filename);
      } else {
        setExportError(
          result.code === "unauthorized"
            ? t("exportErrorUnauthorized")
            : t("exportErrorGeneric")
        );
      }
    });
  }

  return (
    <section>
      <h2 className={`text-base font-semibold text-rizq-ink mb-1 ${font}`}>
        {t("privacySectionTitle")}
      </h2>
      <p className={`text-sm text-rizq-ink-soft mb-4 ${font}`}>
        {t("exportDescription")}
      </p>

      {/* Privacy statement */}
      <div className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 px-5 py-4 mb-5 ${font}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={18}
            strokeWidth={1.6}
            className="text-rizq-green mt-0.5 shrink-0"
          />
          <div>
            <p className={`text-sm text-rizq-ink ${font}`}>
              {t("privacyStatement")}
            </p>
            <div className={`mt-2 flex flex-wrap gap-3 text-xs ${font}`}>
              <Link
                href="/methodology#what-we-dont-do"
                className="inline-flex items-center gap-1 text-rizq-green hover:underline"
              >
                {t("privacyMethodologyLink")}
                <ExternalLink size={11} strokeWidth={1.8} />
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1 text-rizq-ink-soft hover:text-rizq-ink hover:underline"
              >
                {t("privacyPolicyLink")}
                <ExternalLink size={11} strokeWidth={1.8} />
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center gap-1 text-rizq-ink-soft hover:text-rizq-ink hover:underline"
              >
                {t("termsLink")}
                <ExternalLink size={11} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {exportError && (
        <p className={`text-sm text-[var(--over)] mb-3 ${font}`}>{exportError}</p>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 bg-rizq-green/8 hover:bg-rizq-green/15 text-rizq-green px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-60 ${font}`}
      >
        {isPending ? (
          <>
            <Loader2 size={15} className="animate-spin" strokeWidth={2} />
            <span>{t("exportLoading")}</span>
          </>
        ) : (
          <>
            <Download size={15} strokeWidth={1.8} />
            <span>{t("exportButton")}</span>
          </>
        )}
      </button>
    </section>
  );
}

// ── Delete section (with confirm dialog) ────────────────────────────────────

function DeleteSection({
  locale,
  font,
  confirmPhrase,
}: {
  locale: "ar" | "en";
  font: string;
  confirmPhrase: string;
}) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isMatch =
    confirmInput.trim() === "حذف" || confirmInput.trim() === "DELETE";

  function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteMyAccountAction({ confirm: confirmInput.trim() });
      if (result.ok) {
        // Sign out client-side, then redirect home
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace(`/`);
      } else if (result.code === "confirm_mismatch") {
        setDeleteError(t("deleteConfirmMismatch"));
      } else {
        setDeleteError(t("deleteErrorGeneric"));
      }
    });
  }

  return (
    <section>
      <h2 className={`text-base font-semibold text-[var(--over)] mb-1 ${font}`}>
        {t("dangerZoneTitle")}
      </h2>
      <p className={`text-sm text-rizq-ink-soft mb-4 ${font}`}>
        {t("dangerZoneDescription")}
      </p>

      <button
        type="button"
        onClick={() => {
          setShowDialog(true);
          setConfirmInput("");
          setDeleteError(null);
        }}
        className={`inline-flex items-center gap-2 rounded-full border border-[var(--over-line)] bg-[var(--over-soft)] hover:bg-red-100 text-[var(--over)] px-5 py-2.5 text-sm font-medium transition-all ${font}`}
      >
        <Trash2 size={15} strokeWidth={1.8} />
        <span>{t("deleteButton")}</span>
      </button>

      {/* Confirm dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-rizq-ink/40 backdrop-blur-sm"
            onClick={() => !isPending && setShowDialog(false)}
            aria-hidden
          />

          {/* Dialog */}
          <div
            className={`relative z-10 w-full max-w-md rounded-3xl border border-[var(--over-line)] bg-white shadow-2xl p-6 sm:p-8 ${font}`}
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => !isPending && setShowDialog(false)}
              disabled={isPending}
              className="absolute top-4 end-4 rounded-full p-1.5 text-rizq-ink-soft hover:text-rizq-ink hover:bg-rizq-cream transition-colors"
              aria-label={t("dialogClose")}
            >
              <X size={16} strokeWidth={2} />
            </button>

            {/* Icon + title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-[var(--over-soft)] border border-[var(--over-line)] flex items-center justify-center shrink-0">
                <AlertTriangle size={20} strokeWidth={1.8} className="text-[var(--over)]" />
              </div>
              <h3 className={`text-lg font-semibold text-rizq-ink ${font}`}>
                {t("deleteDialogTitle")}
              </h3>
            </div>

            {/* Warning body */}
            <p className={`text-sm text-rizq-ink-soft mb-5 ${font}`}>
              {t("deleteDialogBody")}
            </p>

            {/* Confirm input */}
            <div className="mb-4">
              <label
                htmlFor="delete-confirm-input"
                className={`block text-sm font-medium text-rizq-ink mb-1.5 ${font}`}
              >
                {t("deleteDialogInputLabel", { phrase: confirmPhrase })}
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  setDeleteError(null);
                }}
                disabled={isPending}
                placeholder={confirmPhrase}
                autoComplete="off"
                dir={locale === "ar" ? "rtl" : "ltr"}
                className={`w-full rounded-2xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-2.5 text-sm text-rizq-ink placeholder:text-rizq-ink-soft/40 focus:outline-none focus:border-[var(--over-line)] focus:ring-1 focus:ring-red-200 transition disabled:opacity-60 ${font}`}
              />
            </div>

            {deleteError && (
              <p className={`text-sm text-[var(--over)] mb-3 ${font}`}>{deleteError}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className={`flex-1 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 hover:bg-rizq-cream text-rizq-ink px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-60 ${font}`}
              >
                {t("dialogCancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!isMatch || isPending}
                className={`flex-1 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-red-200 text-white px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 ${font}`}
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={2} />
                    <span>{t("deleteDialogDeleting")}</span>
                  </>
                ) : (
                  <span>{t("deleteDialogConfirmBtn")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Main SettingsClient component ────────────────────────────────────────────

export function SettingsClient({ locale, confirmPhrase }: Props) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <div className="space-y-10">
      <ExportSection locale={locale} font={font} />
      <div className="border-t border-rizq-gold/20" />
      <DeleteSection locale={locale} font={font} confirmPhrase={confirmPhrase} />
    </div>
  );
}
