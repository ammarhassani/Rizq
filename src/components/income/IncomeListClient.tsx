"use client";

import { useState, useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GigCard, type GigRow } from "./GigCard";
import { markGigStatus } from "@/app/actions/gigs/gigs";

type FilterChip = "all" | "paid" | "pending" | "this_month" | "last_month" | "this_year";
type SortKey = "delivery_date" | "amount" | "status";

type Props = { gigs: GigRow[]; locale: "ar" | "en" };

function getMonthRange(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export function IncomeListClient({ gigs, locale }: Props) {
  const t = useTranslations("Income.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [filter, setFilter] = useState<FilterChip>("all");
  const [sort, setSort] = useState<SortKey>("delivery_date");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = [...gigs];

    if (filter === "paid") {
      list = list.filter((g) => g.status === "paid");
    } else if (filter === "pending") {
      list = list.filter((g) => ["pending", "deposit_paid", "in_progress", "delivered", "overdue"].includes(g.status));
    } else if (filter === "this_month") {
      const { start, end } = getMonthRange(0);
      list = list.filter((g) => {
        if (!g.delivery_date) return false;
        const d = new Date(g.delivery_date);
        return d >= start && d <= end;
      });
    } else if (filter === "last_month") {
      const { start, end } = getMonthRange(-1);
      list = list.filter((g) => {
        if (!g.delivery_date) return false;
        const d = new Date(g.delivery_date);
        return d >= start && d <= end;
      });
    } else if (filter === "this_year") {
      const year = new Date().getFullYear();
      list = list.filter((g) => {
        if (!g.delivery_date) return false;
        return new Date(g.delivery_date).getFullYear() === year;
      });
    }

    if (sort === "delivery_date") {
      list.sort((a, b) => {
        if (!a.delivery_date && !b.delivery_date) return 0;
        if (!a.delivery_date) return 1;
        if (!b.delivery_date) return -1;
        return new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime();
      });
    } else if (sort === "amount") {
      list.sort((a, b) => b.amount_sar - a.amount_sar);
    } else if (sort === "status") {
      const order = ["overdue", "in_progress", "delivered", "deposit_paid", "pending", "paid", "cancelled"];
      list.sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)));
    }

    return list;
  }, [gigs, filter, sort]);

  const chips: Array<{ key: FilterChip; label: string }> = [
    { key: "all", label: t("filterAll") },
    { key: "paid", label: t("filterPaid") },
    { key: "pending", label: t("filterPending") },
    { key: "this_month", label: t("filterThisMonth") },
    { key: "last_month", label: t("filterLastMonth") },
    { key: "this_year", label: t("filterThisYear") },
  ];

  const sorts: Array<{ key: SortKey; label: string }> = [
    { key: "delivery_date", label: t("sortDeliveryDate") },
    { key: "amount", label: t("sortAmount") },
    { key: "status", label: t("sortStatus") },
  ];

  function handleMarkPaid(gigId: string) {
    setMarkingId(gigId);
    startTransition(async () => {
      await markGigStatus({ id: gigId, status: "paid" });
      setMarkingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div dir={dir} className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              filter === c.key
                ? "bg-rizq-green text-rizq-cream"
                : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
            } ${font}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div dir={dir} className={`flex items-center gap-2 ${font}`}>
        <span className="text-xs text-rizq-ink-soft/60">{t("sortLabel")}</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={`rounded-lg border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-1.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors appearance-none ${font}`}
        >
          {sorts.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft/70 py-8 text-center ${font}`}>{t("noResults")}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((gig) => (
            <div key={gig.id} className="relative group/row">
              <GigCard gig={gig} locale={locale} />
              {/* Quick "Mark paid" affordance for non-paid, non-cancelled gigs */}
              {gig.status !== "paid" && gig.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleMarkPaid(gig.id); }}
                  disabled={markingId === gig.id}
                  className={`absolute ${isAr ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium opacity-0 group-hover/row:opacity-100 transition-opacity focus:opacity-100 hover:bg-emerald-700 disabled:opacity-50 ${font}`}
                >
                  {markingId === gig.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <span>{t("markPaid")}</span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB — Log gig */}
      <div className={`fixed bottom-8 ${isAr ? "left-6" : "right-6"} z-50`}>
        <Link
          href="/income/new"
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream shadow-lg px-5 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
        >
          <span className="text-lg leading-none">+</span>
          {t("logGig")}
        </Link>
      </div>
    </div>
  );
}
