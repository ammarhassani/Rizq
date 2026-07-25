"use client";

/**
 * InvoiceStatusQuickEdit — inline status pill + dropdown for the invoices list.
 *
 * Shows the invoice status as a brand pill. Opening it reveals the statuses that
 * are valid forward transitions from the current one (mirrors the server's
 * TRANSITIONS map, so we never offer an illegal move). Choosing one updates
 * optimistically via markInvoiceStatus and shows a "Marked … · Undo" toast whose
 * Undo reverts to the captured previous status (using allow_reverse so the
 * server permits the backward step). Rolls back + error-toasts on failure.
 * Sits as an overlay sibling of the InvoiceCard link so its events never navigate.
 */

import { useState, useRef, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { markInvoiceStatus } from "@/app/actions/invoices/markInvoiceStatus";

type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";

// Mirrors the server-side TRANSITIONS map in markInvoiceStatus.ts.
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["viewed", "paid", "overdue", "cancelled"],
  viewed: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-rizq-ink/8 text-rizq-ink-soft border-rizq-ink/15",
  sent: "status-info",
  viewed: "status-info",
  paid: "status-positive",
  overdue: "status-overdue",
  cancelled: "bg-rizq-ink/8 text-rizq-ink-soft border-rizq-ink/15",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-rizq-ink/30", sent: "bg-[var(--acc-tint)]", viewed: "bg-[var(--acc-tint)]",
  paid: "bg-[var(--acc)]", overdue: "bg-[var(--over)]", cancelled: "bg-rizq-ink/30",
};

const LABEL_AR: Record<string, string> = {
  draft: "مسودة", sent: "مُرسَلة", viewed: "مُطَّلَع عليها",
  paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة",
};
const LABEL_EN: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

export function InvoiceStatusQuickEdit({
  invoiceId,
  current,
  locale,
}: {
  invoiceId: string;
  current: string;
  locale: "ar" | "en";
}) {
  const tI18n = useTranslations("Invoices.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();

  const [value, setValue] = useState<string>(current);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

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

  function apply(next: InvoiceStatus, opts?: { isUndo?: boolean; allowReverse?: boolean }) {
    if (next === value) { setOpen(false); return; }
    const prev = value as InvoiceStatus;
    setValue(next); // optimistic
    setOpen(false);
    startTransition(async () => {
      const result = await markInvoiceStatus({
        invoice_id: invoiceId,
        status: next,
        ...(opts?.allowReverse ? { allow_reverse: true } : {}),
      });
      if (result.ok) {
        router.refresh();
        if (!opts?.isUndo) {
          const label = isAr ? LABEL_AR[next] : LABEL_EN[next];
          toast.success(isAr ? `الحالة: ${label} · يمكنك التراجع` : `Marked ${label} · Undo`, {
            duration: 7000,
            action: {
              label: tI18n("undo"),
              // Reverse is rarely a legal forward transition, so force it.
              onClick: () => apply(prev, { isUndo: true, allowReverse: true }),
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
  const style = STATUS_STYLES[value] ?? STATUS_STYLES.draft;
  const options = TRANSITIONS[value as InvoiceStatus] ?? [];
  const interactive = options.length > 0;

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
        disabled={!interactive}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (interactive) setOpen((o) => !o); }}
        className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${style} ${interactive ? "hover:shadow-sm" : "cursor-default opacity-90"} ${font}`}
      >
        <span>{label}</span>
        {interactive && <span aria-hidden className="text-[10px] opacity-70">▾</span>}
      </button>

      {open && interactive && (
        <div
          role="listbox"
          className={`absolute ${isAr ? "left-0" : "right-0"} top-full mt-1 z-20 min-w-40 overflow-hidden rounded-2xl border border-rizq-gold/30 bg-rizq-cream/98 shadow-lg ${font}`}
        >
          {options.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={false}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); apply(s); }}
              className={`flex min-h-10 w-full items-center gap-2 px-3.5 py-2 text-start text-xs text-rizq-ink-soft transition-colors hover:bg-rizq-green/8 hover:text-rizq-green ${font}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s] ?? "bg-rizq-ink/30"}`} aria-hidden />
              {isAr ? LABEL_AR[s] : LABEL_EN[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
