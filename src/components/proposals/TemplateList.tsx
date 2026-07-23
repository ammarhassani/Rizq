"use client";

/**
 * TemplateList — client island for the template manager page.
 * Phase-2 task 2.10.
 *
 * Displays owner's proposal_templates with set-default and delete actions.
 * Uses useTransition + router.refresh() so the server re-renders the list.
 */

import { useState, useTransition } from "react";
import { Loader2, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  setDefaultTemplate,
  deleteTemplate,
} from "@/app/actions/proposals/templates";
import type { TemplateRow } from "@/app/actions/proposals/templates";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  locale: "ar" | "en";
  templates: TemplateRow[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateList({ locale, templates }: Props) {
  const t = useTranslations("Proposals.templates");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // pendingId format: "<templateId>:default" | "<templateId>:delete"
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (templates.length === 0) {
    return (
      <div
        dir={dir}
        className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 text-center ${font}`}
      >
        <p className={`text-rizq-ink font-semibold mb-2 ${font}`}>
          {t("emptyTitle")}
        </p>
        <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("emptyBody")}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSetDefault(templateId: string) {
    if (pendingId) return;
    setPendingId(templateId + ":default");
    startTransition(async () => {
      await setDefaultTemplate({ template_id: templateId });
      router.refresh();
      setPendingId(null);
    });
  }

  function handleDelete(templateId: string) {
    if (pendingId) return;
    setPendingId(templateId + ":delete");
    startTransition(async () => {
      await deleteTemplate({ template_id: templateId });
      router.refresh();
      setPendingId(null);
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div dir={dir} className="space-y-3">
      {templates.map((tpl) => {
        const isSettingDefault = pendingId === tpl.id + ":default";
        const isDeleting = pendingId === tpl.id + ":delete";
        const isBusy = !!pendingId;

        return (
          <div
            key={tpl.id}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 transition-opacity ${isBusy ? "opacity-70" : ""}`}
          >
            {/* Left: name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`font-semibold text-rizq-ink truncate ${font}`}>
                  {isAr ? tpl.name_ar : (tpl.name_en ?? tpl.name_ar)}
                </span>
                {tpl.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rizq-gold/40 bg-rizq-gold/10 px-2 py-0.5 text-xs text-rizq-gold-dark">
                    <Star size={10} />
                    {t("defaultBadge")}
                  </span>
                )}
              </div>
              <div className={`flex flex-wrap gap-4 text-xs text-rizq-ink-soft ${font}`}>
                {tpl.specialty_name && (
                  <span>
                    {t("specialty")}: {tpl.specialty_name}
                  </span>
                )}
                <span>
                  {t("usage")}: {tpl.usage_count}
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {!tpl.is_default && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(tpl.id)}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-4 py-2 text-xs font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all disabled:pointer-events-none ${font}`}
                >
                  {isSettingDefault ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      {t("settingDefault")}
                    </>
                  ) : (
                    <>
                      <Star size={12} />
                      {t("setDefault")}
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDelete(tpl.id)}
                disabled={isBusy}
                className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--over-line)] text-[var(--over)] px-4 py-2 text-xs font-medium hover:bg-[var(--over-soft)] transition-all disabled:pointer-events-none ${font}`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    {t("deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 size={12} />
                    {t("delete")}
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
