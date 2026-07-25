import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FileText, Plus } from "lucide-react";
import { WidgetError } from "./WidgetError";

type Proposal = {
  id: string;
  title: string | null;
  client_name: string | null;
  status: string;
  final_price_sar: number | null;
  created_at: string | null;
};

type Props = {
  proposals: Proposal[];
  error?: boolean;
  locale: "ar" | "en";
};

// Reuse the theme-aware, contrast-paired status pills from globals.css
// (12% accent fill + full-accent text) — never hardcode bg-*-100 + a
// theme-aware text var, which goes light-on-light in dark theme.
const statusColors: Record<string, string> = {
  draft: "status-neutral",
  final: "status-info",
  sent: "status-pending",
  viewed: "status-info",
  accepted: "status-positive",
  declined: "status-overdue",
  expired: "status-neutral",
};

const statusLabelsAr: Record<string, string> = {
  draft: "مسودة",
  final: "معتمد",
  sent: "مُرسَل",
  viewed: "مُطَّلَع عليه",
  accepted: "مقبول",
  declined: "مرفوض",
  expired: "منتهٍ",
};

// English labels — mirror statusLabelsAr so English users never see the raw DB enum.
const statusLabelsEn: Record<string, string> = {
  draft: "Draft",
  final: "Final",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

// Fallback for an unknown/new enum: humanize, never leak the raw value.
const humanizeStatus = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function RecentProposalsWidget({ proposals, error, locale }: Props) {
  const tI18n = useTranslations("Dashboard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  return (
    <div dir={dir} className="rounded-3xl nm-raised border border-[var(--line)] bg-[var(--raised)] p-5 sm:p-6 flex flex-col gap-4 transition-[box-shadow,border-color] duration-200 hover:border-rizq-green/25 hover:shadow-sm">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {tI18n("proposalsTitle")}
          </span>
        </div>
        <Link href="/proposals" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {tI18n("viewAll")}
        </Link>
      </div>

      {error ? (
        <WidgetError locale={locale} />
      ) : proposals.length === 0 ? (
        <div className={`text-center py-4 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {tI18n("proposalsEmpty")}
          </p>
          <Link
            href="/proposals/new"
            className={`inline-flex items-center gap-1 text-sm text-rizq-green hover:underline ${font}`}
          >
            <Plus className="h-3 w-3" />
            {tI18n("proposalsEmptyCta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => (
            <Link
              key={p.id}
              href={`/proposals/${p.id}`}
              className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 hover:bg-rizq-cream/60 transition-colors"
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium text-rizq-ink truncate ${font}`}>
                  {p.title ?? (tI18n("untitledProposal"))}
                </p>
                {p.client_name && (
                  <p className={`text-xs text-rizq-ink-soft truncate ${font}`}>{p.client_name}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {p.final_price_sar != null && (
                  <span className="tabular text-xs font-semibold text-rizq-ink">
                    {new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(p.final_price_sar)}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status] ?? "status-neutral"}`}>
                  {(isAr ? statusLabelsAr : statusLabelsEn)[p.status] ?? humanizeStatus(p.status)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
