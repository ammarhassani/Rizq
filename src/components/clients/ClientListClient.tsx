"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MotionList, MotionItem } from "@/components/motion/MotionList";
import { ClientCard, type ClientRow } from "./ClientCard";

type FilterChip = "all" | "needs_followup" | "recent" | "individual" | "smb" | "corporate" | "government" | "agency";
type SortKey = "needs_followup" | "last_contacted" | "alphabetical" | "total_value";

type Props = { clients: ClientRow[]; locale: "ar" | "en" };

function needsFollowUp(c: ClientRow): boolean {
  if (c.follow_up_priority === "high") return true;
  if (!c.last_contacted_at) return true;
  const days = Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / 86400000);
  return days > 30;
}

export function ClientListClient({ clients, locale }: Props) {
  const t = useTranslations("Clients.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterChip>("all");
  const [sort, setSort] = useState<SortKey>("needs_followup");

  const filtered = useMemo(() => {
    let list = [...clients];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.name_en ?? "").toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q)
      );
    }

    // Filter chip
    if (filter === "needs_followup") list = list.filter(needsFollowUp);
    else if (filter === "recent") {
      list = list.filter((c) => {
        if (!c.last_contacted_at) return false;
        const days = Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / 86400000);
        return days <= 30;
      });
    } else if (filter !== "all") {
      list = list.filter((c) => c.client_type === filter);
    }

    // Sort
    if (sort === "needs_followup") {
      list.sort((a, b) => {
        const pa = a.follow_up_priority === "high" ? 0 : a.follow_up_priority === "medium" ? 1 : 2;
        const pb = b.follow_up_priority === "high" ? 0 : b.follow_up_priority === "medium" ? 1 : 2;
        if (pa !== pb) return pa - pb;
        const da = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
        const db = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
        return da - db;
      });
    } else if (sort === "last_contacted") {
      list.sort((a, b) => {
        const da = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
        const db = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name, isAr ? "ar" : "en"));
    } else if (sort === "total_value") {
      list.sort((a, b) => (b.total_value_sar ?? 0) - (a.total_value_sar ?? 0));
    }

    return list;
  }, [clients, search, filter, sort, isAr]);

  const chips: Array<{ key: FilterChip; label: string }> = [
    { key: "all", label: t("filterAll") },
    { key: "needs_followup", label: t("filterNeedsFollowup") },
    { key: "recent", label: t("filterRecent") },
    { key: "individual", label: t("filterIndividual") },
    { key: "corporate", label: t("filterCorporate") },
  ];

  const sorts: Array<{ key: SortKey; label: string }> = [
    { key: "needs_followup", label: t("sortNeedsFollowup") },
    { key: "last_contacted", label: t("sortLastContacted") },
    { key: "alphabetical", label: t("sortAlphabetical") },
    { key: "total_value", label: t("sortTotalValue") },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        dir={dir}
        className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`}
      />

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
        <MotionList className="space-y-3">
          {filtered.map((c) => (
            <MotionItem key={c.id}>
              <ClientCard client={c} locale={locale} />
            </MotionItem>
          ))}
        </MotionList>
      )}
    </div>
  );
}
