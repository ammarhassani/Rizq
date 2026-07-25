"use client";

/**
 * PriorityQuickEdit — inline follow-up priority control for the Client Book.
 *
 * A tiny 3-stop segmented control (low / medium / high) rendered on top of the
 * ClientCard link so the user can re-prioritise a client without opening the
 * detail page. Optimistic: it flips immediately, calls updateClient, and rolls
 * back + toasts on failure. Lives as an overlay sibling of the card <Link>, so
 * its own pointer/keyboard events are stopped from bubbling into navigation.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { updateClient } from "@/app/actions/clients/clients";

type Priority = "low" | "medium" | "high";

const STOPS: { key: Priority; dot: string; ring: string }[] = [
  { key: "low", dot: "bg-[var(--acc)]", ring: "ring-emerald-500/40" },
  { key: "medium", dot: "bg-[var(--warn)]", ring: "ring-amber-400/40" },
  { key: "high", dot: "bg-[var(--over)]", ring: "ring-red-500/40" },
];

const LABEL_AR: Record<Priority, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية" };
const LABEL_EN: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High" };

export function PriorityQuickEdit({
  clientId,
  current,
  locale,
}: {
  clientId: string;
  current: string | null;
  locale: "ar" | "en";
}) {
  const tI18n = useTranslations("Clients.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();

  // Normalise unknown/null to "medium" for display purposes only.
  const initial: Priority = current === "low" || current === "high" ? current : "medium";
  const [value, setValue] = useState<Priority>(initial);
  const [, startTransition] = useTransition();

  function setPriority(next: Priority) {
    if (next === value) return;
    const prev = value;
    setValue(next); // optimistic
    startTransition(async () => {
      const result = await updateClient({ id: clientId, patch: { follow_up_priority: next } });
      if (result.ok) {
        const label = isAr ? LABEL_AR[next] : LABEL_EN[next];
        toast.success(isAr ? `تم ضبط الأولوية: ${label}` : `Priority set: ${label}`);
        router.refresh();
      } else {
        setValue(prev); // roll back
        toast.error(tI18n("couldnTUpdatePriority"));
      }
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={tI18n("followUpPriority")}
      dir={isAr ? "rtl" : "ltr"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`inline-flex items-center gap-1 rounded-full border border-rizq-gold/30 bg-rizq-cream/90 p-1 shadow-sm print:hidden ${font}`}
    >
      {STOPS.map((s) => {
        const active = value === s.key;
        const label = isAr ? LABEL_AR[s.key] : LABEL_EN[s.key];
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPriority(s.key); }}
            className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 ${s.ring} ${
              active
                ? "bg-rizq-green/10 text-rizq-ink"
                : "text-rizq-ink-soft/70 hover:bg-rizq-ink/5"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${s.dot} ${active ? "" : "opacity-50"}`} aria-hidden />
            {active && <span className="hidden sm:inline">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
