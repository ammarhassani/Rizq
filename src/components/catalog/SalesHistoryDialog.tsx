"use client";

/**
 * SalesHistoryDialog — where a catalog item has been used across invoices.
 *
 * Opens for one item, fetches getItemSalesHistory on open, and shows aggregates
 * (times sold, total qty, total revenue) + the most recent invoices. Linkage is
 * by item_id on invoice lines, so it covers invoices created after item-linkage
 * shipped; older snapshots aren't linked (an honest empty state covers that).
 */

import * as React from "react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { getItemSalesHistory, type ItemSalesHistory, type CreatedItem } from "@/app/actions/items/items";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CreatedItem | null;
  locale: "ar" | "en";
};

export function SalesHistoryDialog({ open, onOpenChange, item, locale }: Props) {
  const t = useTranslations("Catalog");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const currency = t("sar");

  const [history, setHistory] = React.useState<ItemSalesHistory | null>(null);
  const [error, setError] = React.useState(false);
  const [isLoading, startLoad] = useTransition();

  const fmt = React.useCallback(
    (n: number) =>
      new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n),
    [isAr]
  );
  const fmtDate = React.useCallback(
    (iso: string) => {
      try {
        return new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [isAr]
  );

  // Fetch whenever the dialog opens for an item.
  React.useEffect(() => {
    if (!open || !item) return;
    setHistory(null);
    setError(false);
    const id = item.id;
    startLoad(async () => {
      const result = await getItemSalesHistory({ item_id: id });
      if (result.ok) setHistory(result.history);
      else setError(true);
    });
  }, [open, item]);

  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-rizq-gold/20 bg-[var(--raised)] px-4 py-3 text-center">
      <p className="tabular font-sans text-xl font-bold text-rizq-green">{value}</p>
      <p className={cn("mt-0.5 text-xs text-rizq-ink-soft", font)}>{label}</p>
    </div>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-rizq-ink/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <DialogPrimitive.Popup
          dir={dir}
          className={cn(
            "fixed start-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 flex-col sm:max-w-lg",
            "card-wahaj shadow-xl outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
            font
          )}
        >
          <div className="border-b border-rizq-gold/20 px-6 pt-6 pb-4 sm:px-8">
            <DialogPrimitive.Title className={cn("text-lg font-semibold text-rizq-ink leading-snug", font)}>
              {t("salesHistoryTitle")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className={cn("mt-1 text-sm text-rizq-ink-soft/70", font)}>
              {item?.name ?? ""}
            </DialogPrimitive.Description>
          </div>

          <div className="overflow-y-auto px-6 py-5 sm:px-8">
            {isLoading || (!history && !error) ? (
              <div className="flex items-center justify-center gap-2 py-10 text-rizq-ink-soft">
                <Loader2 size={18} className="animate-spin" strokeWidth={2.2} aria-hidden />
                <span className={cn("text-sm", font)}>{t("histLoading")}</span>
              </div>
            ) : error ? (
              <p className={cn("py-10 text-center text-sm text-[var(--over)]", font)}>{t("histError")}</p>
            ) : history && history.count === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rizq-green/10 text-rizq-green">
                  <HistoryIcon size={22} strokeWidth={1.6} aria-hidden />
                </div>
                <p className={cn("text-sm text-rizq-ink-soft", font)}>{t("histEmpty")}</p>
              </div>
            ) : history ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {stat(t("histTimesSold"), fmt(history.count))}
                  {stat(t("histTotalQty"), fmt(history.totalQty))}
                  {stat(t("histTotalRevenue"), `${fmt(history.totalRevenue)} ${currency}`)}
                </div>

                <p className={cn("mt-6 mb-2 text-xs uppercase tracking-[0.14em] text-rizq-ink-soft/70", font)}>
                  {t("histRecentHeading")}
                </p>
                <ul className="space-y-2">
                  {history.recent.map((r) => (
                    <li
                      key={r.invoice_id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/20 bg-[var(--raised)] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="tabular font-sans text-sm font-medium text-rizq-ink">{r.invoice_number}</p>
                        <p className={cn("truncate text-xs text-rizq-ink-soft", font)}>
                          {(r.clientName ?? t("histClientUnknown")) + " · " + fmtDate(r.date)}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="tabular font-sans text-sm font-semibold text-rizq-ink">
                          {fmt(r.lineTotal)}{" "}
                          <span className={cn("text-xs font-normal text-rizq-ink-soft/60", font)}>{currency}</span>
                        </p>
                        <p className={cn("text-xs text-rizq-ink-soft/70", font)}>×{fmt(r.qty)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="border-t border-rizq-gold/20 px-6 py-4 sm:px-8">
            <DialogPrimitive.Close
              type="button"
              className={cn(
                "inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-rizq-gold/30 bg-transparent px-6 py-3 text-sm text-rizq-ink-soft transition-all hover:border-rizq-ink/30 hover:text-rizq-ink",
                font
              )}
            >
              {t("close")}
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
