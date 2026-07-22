"use client";

/**
 * ProposalAnchorPicker (feature 005, US4) — pick an UNANCHORED proposal to anchor
 * a new project to it. Searchable; on select → createProjectFromProposal →
 * /projects/{id}?guided=1. Empty state routes to "create a new proposal".
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Search, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { listProposalsForAnchor, type AnchorProposal } from "@/app/actions/projects/listProposalsForAnchor";
import { createProjectFromProposal } from "@/app/actions/projects/createProjectFromProposal";

const STATUS_AR: Record<string, string> = {
  accepted: "مقبول", sent: "أُرسل", viewed: "اطُّلع عليه", draft: "مسودة", declined: "مرفوض", expired: "منتهٍ", final: "نهائي",
};
const STATUS_EN: Record<string, string> = {
  accepted: "Accepted", sent: "Sent", viewed: "Viewed", draft: "Draft", declined: "Declined", expired: "Expired", final: "Final",
};

export function ProposalAnchorPicker({ locale, onCreateNew }: { locale: "ar" | "en"; onCreateNew: () => void }) {
  const t = useTranslations("Wizard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [items, setItems] = useState<AnchorProposal[]>([]);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    listProposalsForAnchor()
      .then((r) => {
        if (!active) return;
        if (r.ok) { setItems(r.items); setStatus("ok"); }
        else setStatus("error");
      })
      .catch(() => active && setStatus("error"));
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.clientName ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  function anchor(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const r = await createProjectFromProposal({ proposal_id: id });
      if (r.ok) {
        router.push(`/projects/${r.project_id}?guided=1` as `/projects/${string}`);
      } else {
        setPendingId(null);
        setError(t("error"));
      }
    });
  }

  const fmt = (n: number | null) =>
    n == null ? "" : new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);

  if (status === "loading") {
    return (
      <div className="space-y-2" aria-busy>
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-rizq-gold/10 animate-pulse motion-reduce:animate-none" />)}
      </div>
    );
  }

  if (status === "error") {
    return <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>{t("error")}</p>;
  }

  if (items.length === 0) {
    return (
      <div dir={dir} className={`rounded-2xl border border-rizq-gold/25 bg-rizq-cream/70 p-8 text-center ${font}`}>
        <p className={`text-sm text-rizq-ink-soft mb-4 ${font}`}>{t("pickerEmpty")}</p>
        <button
          type="button"
          onClick={onCreateNew}
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
        >
          {t("pickerEmptyCta")}
        </button>
      </div>
    );
  }

  return (
    <div dir={dir} className={font}>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-rizq-ink-soft/50" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("pickerSearch")}
          aria-label={t("pickerSearch")}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-[var(--raised)] py-2.5 ltr:pl-9 rtl:pr-9 px-4 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
        />
      </div>

      {error && <p role="alert" className={`mb-3 text-sm text-[var(--over)] ${font}`}>{error}</p>}

      <ul className="space-y-2">
        {filtered.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => anchor(p.id)}
              disabled={pendingId !== null}
              className={`w-full text-start flex items-center justify-between gap-3 rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] hover:bg-rizq-cream/90 hover:border-rizq-green/30 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 px-4 py-3 ${font}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {pendingId === p.id ? <Loader2 size={15} className="animate-spin text-rizq-green shrink-0" /> : <FileText size={15} className="text-rizq-ink-soft shrink-0" aria-hidden />}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-rizq-ink truncate">{p.clientName || p.title}</span>
                  <span className={`block text-xs text-rizq-ink-soft/70 truncate ${font}`}>{p.clientName ? p.title : (isAr ? STATUS_AR[p.status] : STATUS_EN[p.status])}</span>
                </span>
              </span>
              <span className="shrink-0 text-end">
                {p.priceAnchor != null && <span className="tabular font-sans block text-sm font-bold text-rizq-green leading-none">{fmt(p.priceAnchor)}</span>}
                <span className="inline-flex items-center rounded-full bg-rizq-green/8 text-rizq-green/80 px-2 py-0.5 text-[11px] mt-0.5">{isAr ? STATUS_AR[p.status] : STATUS_EN[p.status]}</span>
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className={`text-sm text-rizq-ink-soft/60 py-4 text-center ${font}`}>{t("pickerNoResults")}</li>}
      </ul>
    </div>
  );
}
