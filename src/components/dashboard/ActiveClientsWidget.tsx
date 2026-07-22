import { Link } from "@/i18n/navigation";
import { Users, AlertCircle, Plus } from "lucide-react";
import { WidgetError } from "./WidgetError";

type Client = {
  id: string;
  name: string;
  total_gigs: number | null;
  total_value_sar: number | null;
  last_contacted_at: string | null;
};

type Props = {
  clients: Client[];
  error?: boolean;
  locale: "ar" | "en";
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function ActiveClientsWidget({ clients, error, locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const needsFollowup = clients.filter((c) => {
    const d = daysSince(c.last_contacted_at);
    return d !== null && d > 60;
  });

  return (
    <div dir={dir} className="rounded-3xl nm-raised border border-[var(--line)] bg-[var(--raised)] p-5 sm:p-6 flex flex-col gap-4 transition-[box-shadow,border-color] duration-200 hover:border-rizq-green/25 hover:shadow-sm">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {isAr ? "العملاء النشطون" : "Active Clients"}
          </span>
        </div>
        <Link href="/clients" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {isAr ? "عرض الكل ←" : "View all →"}
        </Link>
      </div>

      {error ? (
        <WidgetError locale={locale} />
      ) : clients.length === 0 ? (
        <div className={`text-center py-4 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {isAr ? "ما عندك عملاء بعد." : "No clients yet."}
          </p>
          <Link
            href="/clients/new"
            className={`inline-flex items-center gap-1 text-sm text-rizq-green hover:underline ${font}`}
          >
            <Plus className="h-3 w-3" />
            {isAr ? "أضف أول عميل" : "Add your first client"}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-4 px-1">
            <div>
              <p className="tabular text-2xl font-bold text-rizq-green leading-none">{clients.length}</p>
              <p className={`text-xs text-rizq-ink-soft mt-0.5 ${font}`}>{isAr ? "إجمالي العملاء" : "Total clients"}</p>
            </div>
            {needsFollowup.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-3 py-1.5">
                <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                <p className={`text-xs text-amber-700 ${font}`}>
                  {needsFollowup.length} {isAr ? "يحتاج متابعة" : "need follow-up"}
                </p>
              </div>
            )}
          </div>
          {clients.slice(0, 3).map((c) => {
            const d = daysSince(c.last_contacted_at);
            const stale = d !== null && d > 60;
            return (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2 hover:bg-rizq-cream/60 transition-colors"
              >
                <p className={`text-sm font-medium text-rizq-ink truncate ${font}`}>{c.name}</p>
                {stale && (
                  <span className={`text-xs text-amber-600 shrink-0 ${font}`}>
                    {isAr ? `${d} يوم` : `${d}d ago`}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
