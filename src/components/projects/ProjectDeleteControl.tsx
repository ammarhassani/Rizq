"use client";

/**
 * ProjectDeleteControl — Feature 002 (Project hub), task T023.
 * Delete button + bilingual confirm. Calls archiveProject (soft-archive when the
 * project has money/invoices) and returns to the Income Ledger on success.
 */

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { archiveProject } from "@/app/actions/projects/archiveProject";
import { track } from "@/lib/analytics/track";

type Props = { locale: "ar" | "en"; projectId: string };

export function ProjectDeleteControl({ locale, projectId }: Props) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await archiveProject({ project_id: projectId });
      if (!result.ok) {
        setError(t("deleteError"));
        return;
      }
      track("project_archived", { locale, project_id: projectId, mode: result.mode });
      router.push("/income");
      router.refresh();
    });
  }

  return (
    <div dir={dir} className={font}>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`inline-flex items-center gap-1.5 text-xs font-medium text-red-600/75 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 rounded ${font}`}
        >
          <Trash2 size={13} aria-hidden />
          {t("delete")}
        </button>
      ) : (
        <div className={`rounded-xl border border-red-200 bg-red-50/60 p-4 space-y-3 ${font}`}>
          <p className={`text-sm text-rizq-ink ${font}`}>{t("deleteConfirm")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {t("deleteConfirmBtn")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className={`mt-2 text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}
    </div>
  );
}
