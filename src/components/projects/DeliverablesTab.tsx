"use client";

/**
 * DeliverablesTab — Project Workspace (spec 004), task T013.
 * Unified "what I'm handing over" list (deliverable files + integration links),
 * each advanced through draft → ready → sent via the pure state machine.
 */

import { useState, useTransition } from "react";
import { Loader2, FileText, Link2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { setDeliverableState, type DeliverableItem } from "@/app/actions/projects/deliverables";
import { getDocumentSignedUrl } from "@/app/actions/documents/documentActions";
import { nextState, normalizeState } from "@/lib/projects/deliverableState";

const STATE_LABEL_KEY: Record<string, string> = { draft: "stateDraft", ready: "stateReady", sent: "stateSent" };
const STATE_STYLE: Record<string, string> = {
  draft: "bg-rizq-gold/15 text-rizq-ink-soft",
  ready: "status-info",
  sent: "bg-emerald-100 text-[var(--acc)]",
};

export function DeliverablesTab({
  locale,
  items,
}: {
  locale: "ar" | "en";
  items: DeliverableItem[];
}) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function advance(item: DeliverableItem) {
    const target = nextState(item.handover_state);
    if (!target) return;
    setBusyId(item.id);
    startTransition(async () => {
      await setDeliverableState({ source: item.source, id: item.id, target });
      setBusyId(null);
      router.refresh();
    });
  }

  async function open(item: DeliverableItem) {
    if (item.source === "link" && item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    const r = await getDocumentSignedUrl({ id: item.id });
    if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
  }

  if (items.length === 0) {
    return <p dir={dir} className={`text-sm text-rizq-ink-soft ${font}`}>{t("deliverablesEmpty")}</p>;
  }

  return (
    <ul dir={dir} className={`space-y-2 ${font}`}>
      {items.map((item) => {
        const state = normalizeState(item.handover_state);
        const target = nextState(item.handover_state);
        const advanceLabel = target === "ready" ? t("markReady") : target === "sent" ? t("markSent") : null;
        return (
          <li
            key={`${item.source}-${item.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-[var(--raised)] px-4 py-3"
          >
            <span className="flex items-center gap-2 min-w-0">
              {item.source === "file" ? (
                <FileText size={15} className="text-rizq-ink-soft shrink-0" />
              ) : (
                <Link2 size={15} className="text-rizq-ink-soft shrink-0" />
              )}
              <span className="min-w-0">
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={`block text-sm font-medium text-rizq-ink truncate hover:text-rizq-green hover:underline text-start ${font}`}
                >
                  {item.label}
                </button>
                <span className="text-xs text-rizq-ink-soft/60">
                  {item.source === "file" ? t("deliverableFile") : t("deliverableLink")}
                </span>
              </span>
            </span>

            <span className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATE_STYLE[state]} ${font}`}>
                {state === "sent" && <Check size={12} />}
                {t(STATE_LABEL_KEY[state])}
              </span>
              {advanceLabel && (
                <button
                  type="button"
                  onClick={() => advance(item)}
                  disabled={busyId === item.id}
                  className={`inline-flex items-center gap-1 rounded-full border border-rizq-green/40 text-rizq-green px-3 py-1.5 text-xs font-medium hover:bg-rizq-green/8 transition-colors disabled:opacity-60 ${font}`}
                >
                  {busyId === item.id ? <Loader2 size={12} className="animate-spin" /> : null}
                  {advanceLabel}
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
