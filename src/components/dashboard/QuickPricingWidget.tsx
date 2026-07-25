import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Tag } from "lucide-react";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";

type Props = {
  anchor: number | null;
  specialty: string | null;
  /** Provenance citation (source + sample size + date range) — required by Principle I. */
  citation: string | null;
  locale: "ar" | "en";
};

export function QuickPricingWidget({ anchor, specialty, citation, locale }: Props) {
  const tI18n = useTranslations("Dashboard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  return (
    <div dir={dir} className="rounded-3xl nm-raised border border-[var(--line)] bg-[var(--raised)] p-5 sm:p-6 flex flex-col gap-4 transition-[box-shadow,border-color] duration-200 hover:border-rizq-green/25 hover:shadow-sm">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {tI18n("quickPricingTitle")}
          </span>
        </div>
        <Link href="/tool" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {tI18n("quickPricingViewTool")}
        </Link>
      </div>

      {anchor != null ? (
        <div>
          <p className="tabular font-sans text-2xl font-bold text-rizq-green leading-none">
            <AnimatedNumber value={anchor} locale={locale} duration={0.9} />
          </p>
          <p className={`text-xs text-rizq-ink-soft mt-1 ${font}`}>
            {isAr ? `وسيط السوق: ${specialty ?? "تخصصك"}` : `Market median: ${specialty ?? "your specialty"}`}
          </p>
          {/* Honesty (Principle I): the median must cite its provenance + sample + date. */}
          {citation && (
            <p className={`text-[11px] leading-snug text-rizq-ink-soft/75 mt-1.5 ${font}`}>{citation}</p>
          )}
          <Link
            href="/tool"
            className={`mt-3 inline-flex items-center gap-1 text-xs text-rizq-green hover:underline ${font}`}
          >
            {tI18n("quickPricingQueryMore")}
          </Link>
        </div>
      ) : (
        <div className={`text-center py-3 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {tI18n("quickPricingEmpty")}
          </p>
          <Link
            href="/tool"
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-4 py-2 text-sm font-medium hover:bg-rizq-green-dark transition-colors ${font}`}
          >
            {tI18n("quickPricingEmptyCta")}
          </Link>
        </div>
      )}
    </div>
  );
}
