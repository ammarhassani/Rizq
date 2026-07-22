import { Link } from "@/i18n/navigation";
import { CalendarClock, Plus } from "lucide-react";
import type { UpcomingInvoice } from "@/lib/invoices/queries";
import { WidgetError } from "./WidgetError";

type Props = {
  invoices: UpcomingInvoice[];
  error?: boolean;
  locale: "ar" | "en";
};

function fmtDate(iso: string, locale: "ar" | "en"): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const statusColors: Record<string, string> = {
  sent: "text-[var(--warn)]",
  viewed: "text-[var(--acc-tint)]",
  overdue: "text-[var(--over)]",
};

export function UpcomingDeadlinesWidget({ invoices, error, locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  return (
    <div dir={dir} className="rounded-3xl nm-raised border border-[var(--line)] bg-[var(--raised)] p-5 sm:p-6 flex flex-col gap-4 transition-[box-shadow,border-color] duration-200 hover:border-rizq-green/25 hover:shadow-sm">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {isAr ? "المواعيد القادمة" : "Upcoming Deadlines"}
          </span>
        </div>
        <Link href="/calendar" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {isAr ? "عرض الكل ←" : "View all →"}
        </Link>
      </div>

      {error ? (
        <WidgetError locale={locale} />
      ) : invoices.length === 0 ? (
        <div className={`text-center py-4 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {isAr ? "لا توجد مواعيد قادمة." : "No upcoming deadlines."}
          </p>
          <Link
            href="/invoices/new"
            className={`inline-flex items-center gap-1 text-sm text-rizq-green hover:underline ${font}`}
          >
            <Plus className="h-3 w-3" />
            {isAr ? "أنشئ فاتورة" : "Create an invoice"}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.slice(0, 7).map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 hover:bg-rizq-cream/60 transition-colors"
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium text-rizq-ink truncate ${font}`}>{inv.invoice_number}</p>
                <p className={`text-xs tabular text-rizq-ink-soft ${font}`}>
                  {new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(inv.total_sar)} {isAr ? "ر.س" : "SAR"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-medium tabular ${statusColors[inv.status] ?? "text-rizq-ink-soft"} ${font}`}>
                  {fmtDate(inv.due_date, locale)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
