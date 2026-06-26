/**
 * ClientCard — Client Book. Phase-3 task 3.2.
 */
import { Link } from "@/i18n/navigation";

export type ClientRow = {
  id: string;
  name: string;
  name_en: string | null;
  company: string | null;
  client_type: string | null;
  last_contacted_at: string | null;
  total_gigs: number | null;
  total_value_sar: number | null;
  rating: number | null;
  follow_up_priority: string | null;
  tags: string[] | null;
  is_active: boolean | null;
};

type Props = {
  client: ClientRow;
  locale: "ar" | "en";
  /** Optional interactive control (e.g. the follow-up priority quick-edit)
   *  rendered inline in the card's meta row. Kept out of the title/price area
   *  so it never overlaps existing content. */
  prioritySlot?: React.ReactNode;
};

function relativeDate(iso: string | null, locale: "ar" | "en"): string {
  if (!iso) return locale === "ar" ? "لم يُتواصل بعد" : "Never contacted";
  try {
    const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (diffDays === 0) return locale === "ar" ? "اليوم" : "Today";
    if (diffDays === 1) return locale === "ar" ? "أمس" : "Yesterday";
    if (locale === "ar") return `منذ ${diffDays} يومًا`;
    return `${diffDays} days ago`;
  } catch { return ""; }
}

function followUpDot(lastContactedAt: string | null, priority: string | null): string {
  if (priority === "high") return "bg-red-500";
  if (!lastContactedAt) return "bg-red-400";
  const days = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / 86400000);
  if (days > 30) return "bg-red-500";
  if (days > 14) return "bg-amber-400";
  return "bg-emerald-500";
}

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (!n || !isFinite(n)) return "";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

export function ClientCard({ client, locale, prioritySlot }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const dotColor = followUpDot(client.last_contacted_at, client.follow_up_priority);
  const dateLabel = relativeDate(client.last_contacted_at, locale);
  const priceFormatted = fmtPrice(client.total_value_sar, locale);

  return (
    <Link
      href={`/clients/${client.id}` as `/clients/${string}`}
      className={`group block rounded-2xl border border-rizq-gold/20 bg-white/70 hover:bg-rizq-cream/90 hover:border-rizq-green/30 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 p-5 ${font}`}
    >
      <div dir={dir} className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-start gap-3">
          {/* Follow-up dot */}
          <span className={`mt-1.5 flex-shrink-0 h-2.5 w-2.5 rounded-full ${dotColor}`} aria-hidden />
          <div className="min-w-0">
            <p className="text-base font-semibold text-rizq-ink leading-snug group-hover:text-rizq-green transition-colors truncate">
              {client.name}
            </p>
            {client.company && (
              <p className="mt-0.5 text-sm text-rizq-ink-soft truncate">{client.company}</p>
            )}
          </div>
        </div>
        {priceFormatted && (
          <div className="shrink-0 text-end">
            <p className="tabular font-sans text-base font-semibold text-rizq-green leading-none">{priceFormatted}</p>
            <p className={`text-xs text-rizq-ink-soft/70 mt-0.5 ${font}`}>{isAr ? "ريال" : "SAR"}</p>
          </div>
        )}
      </div>
      <div dir={dir} className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {prioritySlot}
          {client.total_gigs != null && client.total_gigs > 0 && (
            <span className={`text-xs text-rizq-ink-soft ${font}`}>
              {client.total_gigs} {isAr ? "مشروع" : "projects"}
            </span>
          )}
          {client.rating && (
            <span className="text-xs text-rizq-gold">{"★".repeat(client.rating)}</span>
          )}
        </div>
        <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{dateLabel}</span>
      </div>
    </Link>
  );
}
