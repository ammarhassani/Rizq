/**
 * ProposalCard — Phase-2 task 2.9 (list page)
 *
 * Server-safe presentational card for a single proposal row.
 * Derives a display title from scope_json.deliverables[0] or falls back to
 * a generic label. Links the whole card to /[locale]/proposals/[id].
 */

import { Link } from "@/i18n/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProposalRow = {
  id: string;
  status: string | null;
  client_name: string | null;
  price_anchor: number | null;
  created_at: string | null;
  scope_json: unknown;
  specialty_id: string | null;
};

type Props = {
  proposal: ProposalRow;
  locale: "ar" | "en";
};

// ---------------------------------------------------------------------------
// Status badge colours
// ---------------------------------------------------------------------------

type StatusKey = "draft" | "final" | "sent" | "viewed" | "accepted" | "declined" | "expired";

const STATUS_STYLES: Record<StatusKey, string> = {
  draft:    "bg-rizq-ink/8 text-rizq-ink-soft",
  final:    "bg-rizq-green/12 text-rizq-green",
  sent:     "status-info",
  viewed:   "bg-purple-50 text-purple-700",
  accepted: "status-positive",
  declined: "bg-red-50 text-[var(--over)]",
  expired:  "status-pending",
};

function statusStyle(status: string | null): string {
  const key = (status ?? "draft") as StatusKey;
  return STATUS_STYLES[key] ?? STATUS_STYLES.draft;
}

// ---------------------------------------------------------------------------
// i18n (inline — server component, avoid async boundary)
// ---------------------------------------------------------------------------

const T = {
  ar: {
    status: {
      draft:    "مسودة",
      final:    "معتمد",
      sent:     "مُرسَل",
      viewed:   "تمت المشاهدة",
      accepted: "مقبول",
      declined: "مرفوض",
      expired:  "منتهي الصلاحية",
    },
    newClient:    "عميل جديد",
    currency:     "ريال",
    fallbackTitle:"عرض سعر",
    daysAgo:      (n: number) => `منذ ${n} يومًا`,
    todayAgo:     "اليوم",
    yesterdayAgo: "أمس",
  },
  en: {
    status: {
      draft:    "Draft",
      final:    "Finalized",
      sent:     "Sent",
      viewed:   "Viewed",
      accepted: "Accepted",
      declined: "Declined",
      expired:  "Expired",
    },
    newClient:    "New client",
    currency:     "SAR",
    fallbackTitle:"Pricing proposal",
    daysAgo:      (n: number) => `${n} days ago`,
    todayAgo:     "Today",
    yesterdayAgo: "Yesterday",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveTitle(scopeJson: unknown, locale: "ar" | "en", fallback: string): string {
  try {
    const scope = scopeJson as Record<string, unknown> | null;
    if (!scope) return fallback;
    const deliverables = scope["deliverables"];
    if (Array.isArray(deliverables) && deliverables.length > 0) {
      const first = deliverables[0];
      if (typeof first === "string" && first.length > 0) {
        // Truncate to ~48 chars
        return first.length > 48 ? first.slice(0, 46) + "…" : first;
      }
    }
    // Try description
    const description = scope["description"];
    if (typeof description === "string" && description.length > 0) {
      return description.length > 48 ? description.slice(0, 46) + "…" : description;
    }
  } catch {
    /* silent */
  }
  return fallback;
}

function relativeDate(iso: string | null, t: typeof T["ar"] | typeof T["en"]): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t.todayAgo;
    if (diffDays === 1) return t.yesterdayAgo;
    return t.daysAgo(diffDays);
  } catch {
    return "";
  }
}

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !isFinite(n)) return "";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalCard({ proposal, locale }: Props) {
  const t = T[locale];
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const title = deriveTitle(proposal.scope_json, locale, t.fallbackTitle);
  // Lead with the client (what a freelancer recognizes); the derived
  // deliverable/brief becomes the secondary line. Falls back to the title when
  // no client is set yet. (UI/UX audit P3.)
  const hasClient = !!proposal.client_name?.trim();
  const primaryLabel = hasClient ? proposal.client_name!.trim() : title;
  const secondaryLabel = hasClient ? title : t.newClient;
  const statusKey = (proposal.status ?? "draft") as StatusKey;
  const statusLabel = t.status[statusKey] ?? t.status.draft;
  const dateLabel = relativeDate(proposal.created_at, t);
  const priceFormatted = fmtPrice(proposal.price_anchor, locale);

  return (
    <Link
      href={`/proposals/${proposal.id}` as `/proposals/${string}`}
      className={`group block rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] hover:bg-rizq-cream/90 hover:border-rizq-green/30 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition duration-200 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 p-5 ${font}`}
    >
      <div dir={dir} className="flex items-start justify-between gap-4">
        {/* Left: client (primary) + deliverable/brief (secondary) */}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-rizq-ink leading-snug group-hover:text-rizq-green transition-colors truncate">
            {primaryLabel}
          </p>
          <p className="mt-1 text-sm text-rizq-ink-soft truncate">
            {secondaryLabel}
          </p>
        </div>

        {/* Right: price */}
        {priceFormatted && (
          <div className="shrink-0 text-end">
            <p className="tabular font-sans text-lg font-semibold text-rizq-green leading-none">
              {priceFormatted}
            </p>
            <p className={`text-xs text-rizq-ink-soft/70 mt-0.5 ${font}`}>{t.currency}</p>
          </div>
        )}
      </div>

      {/* Footer: status badge + date */}
      <div dir={dir} className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none ${statusStyle(proposal.status)} ${font}`}
        >
          {statusLabel}
        </span>
        {dateLabel && (
          <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{dateLabel}</span>
        )}
      </div>
    </Link>
  );
}
