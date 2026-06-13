import { Link } from "@/i18n/navigation";
import { FileText, Plus } from "lucide-react";

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
  locale: "ar" | "en";
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  final: "bg-blue-100 text-blue-700",
  sent: "bg-amber-100 text-amber-700",
  viewed: "bg-purple-100 text-purple-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
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

export function RecentProposalsWidget({ proposals, locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  return (
    <div dir={dir} className="rounded-3xl border border-rizq-gold/25 bg-white/70 p-5 sm:p-6 flex flex-col gap-4">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {isAr ? "أحدث العروض" : "Recent Proposals"}
          </span>
        </div>
        <Link href="/proposals" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {isAr ? "عرض الكل ←" : "View all →"}
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className={`text-center py-4 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {isAr ? "ما عندك عروض حتى الآن." : "No proposals yet."}
          </p>
          <Link
            href="/proposals/new"
            className={`inline-flex items-center gap-1 text-sm text-rizq-green hover:underline ${font}`}
          >
            <Plus className="h-3 w-3" />
            {isAr ? "أنشئ أول عرض" : "Create your first proposal"}
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
                  {p.title ?? (isAr ? "عرض بدون عنوان" : "Untitled proposal")}
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
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {isAr ? (statusLabelsAr[p.status] ?? p.status) : p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
