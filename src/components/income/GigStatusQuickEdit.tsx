"use client";

/**
 * GigStatusQuickEdit — inline status pill + dropdown for the Income Ledger.
 *
 * Renders the gig's status as a brand-styled pill that, when clicked, reveals a
 * small menu of statuses. Choosing one updates optimistically via markGigStatus,
 * shows a success toast with an Undo (status changes are reversible), and rolls
 * back + error-toasts on failure. Sits as an overlay sibling of the GigCard link,
 * so its events never trigger navigation.
 */

import { useState, useRef, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { markGigStatus } from "@/app/actions/gigs/gigs";

const STATUSES = ["pending", "deposit_paid", "in_progress", "delivered", "paid", "overdue", "cancelled"] as const;
type GigStatus = (typeof STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  paid: "status-positive",
  pending: "status-pending",
  deposit_paid: "status-pending",
  in_progress: "status-info",
  delivered: "status-info",
  overdue: "status-overdue",
  cancelled: "bg-rizq-ink/8 text-rizq-ink-soft border-rizq-ink/15",
};

const STATUS_DOT: Record<string, string> = {
  paid: "bg-[var(--acc)]", pending: "bg-[var(--warn)]", deposit_paid: "bg-[var(--warn)]",
  in_progress: "bg-[var(--acc-tint)]", delivered: "bg-[var(--acc-tint)]", overdue: "bg-[var(--over)]", cancelled: "bg-rizq-ink/30",
};

const LABEL_AR: Record<string, string> = {
  paid: "مدفوع", pending: "قيد الانتظار", deposit_paid: "دفعة مقدمة",
  in_progress: "جاري", delivered: "مُسلَّم", overdue: "متأخر", cancelled: "ملغى",
};
const LABEL_EN: Record<string, string> = {
  paid: "Paid", pending: "Pending", deposit_paid: "Deposit paid",
  in_progress: "In progress", delivered: "Delivered", overdue: "Overdue", cancelled: "Cancelled",
};

export function GigStatusQuickEdit({
  gigId,
  current,
  locale,
}: {
  gigId: string;
  current: string;
  locale: "ar" | "en";
}) {
  const tI18n = useTranslations("Income.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();

  const [value, setValue] = useState<string>(current);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function apply(next: GigStatus, isUndo = false) {
    if (next === value) { setOpen(false); return; }
    const prev = value;
    setValue(next); // optimistic
    setOpen(false);
    startTransition(async () => {
      const result = await markGigStatus({ id: gigId, status: next });
      if (result.ok) {
        router.refresh();
        if (!isUndo) {
          const label = isAr ? LABEL_AR[next] : LABEL_EN[next];
          toast.success(isAr ? `الحالة: ${label}` : `Status: ${label}`, {
            duration: 7000,
            action: {
              label: tI18n("undo"),
              onClick: () => apply(prev as GigStatus, true),
            },
          });
        }
      } else {
        setValue(prev); // roll back
        toast.error(tI18n("couldnTUpdateStatus"));
      }
    });
  }

  const label = isAr ? (LABEL_AR[value] ?? value) : (LABEL_EN[value] ?? value);
  const style = STATUS_STYLES[value] ?? STATUS_STYLES.pending;

  return (
    <div
      ref={rootRef}
      dir={isAr ? "rtl" : "ltr"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`relative print:hidden ${font}`}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={isAr ? `الحالة: ${label}` : `Status: ${label}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-all hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${style} ${font}`}
      >
        <span>{label}</span>
        <span aria-hidden className="text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute ${isAr ? "left-0" : "right-0"} top-full mt-1 z-20 min-w-40 overflow-hidden rounded-2xl border border-rizq-gold/30 bg-rizq-cream/98 shadow-lg ${font}`}
        >
          {STATUSES.map((s) => {
            const active = s === value;
            return (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={active}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); apply(s); }}
                className={`flex min-h-10 w-full items-center gap-2 px-3.5 py-2 text-start text-xs transition-colors ${
                  active ? "bg-rizq-green/10 text-rizq-ink font-medium" : "text-rizq-ink-soft hover:bg-rizq-green/8 hover:text-rizq-green"
                } ${font}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s] ?? "bg-rizq-ink/30"}`} aria-hidden />
                {isAr ? LABEL_AR[s] : LABEL_EN[s]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
