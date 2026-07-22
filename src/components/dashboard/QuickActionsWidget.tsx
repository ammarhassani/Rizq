import { Link } from "@/i18n/navigation";
import { Zap, FilePlus, PlusCircle, UserPlus, Receipt } from "lucide-react";

type Props = { locale: "ar" | "en" };

export function QuickActionsWidget({ locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const actions = [
    {
      href: "/proposals/new" as const,
      icon: FilePlus,
      labelAr: "عرض جديد",
      labelEn: "New Proposal",
      color: "text-rizq-green",
    },
    {
      href: "/income/new" as const,
      icon: PlusCircle,
      labelAr: "سجّل مشروع",
      labelEn: "Log Project",
      color: "text-[var(--acc)]",
    },
    {
      href: "/clients/new" as const,
      icon: UserPlus,
      labelAr: "عميل جديد",
      labelEn: "Add Client",
      color: "text-[var(--acc-tint)]",
    },
    {
      href: "/invoices/new" as const,
      icon: Receipt,
      labelAr: "فاتورة جديدة",
      labelEn: "New Invoice",
      color: "text-[var(--warn)]",
    },
  ];

  return (
    <div dir={dir} className="rounded-3xl nm-raised border border-[var(--line)] bg-[var(--raised)] p-5 sm:p-6 flex flex-col gap-4 transition-[box-shadow,border-color] duration-200 hover:border-rizq-green/25 hover:shadow-sm">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-rizq-gold opacity-80" />
        <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
          {isAr ? "إجراءات سريعة" : "Quick Actions"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border border-rizq-gold/15 bg-rizq-cream/50 px-3 py-3 hover:bg-rizq-cream/80 hover:border-rizq-gold/30 transition-all text-center ${font}`}
            >
              <Icon className={`h-5 w-5 ${a.color}`} />
              <span className={`text-xs font-medium text-rizq-ink ${font}`}>
                {isAr ? a.labelAr : a.labelEn}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
