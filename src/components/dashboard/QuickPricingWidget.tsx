import { Link } from "@/i18n/navigation";
import { Tag } from "lucide-react";
import { AnimatedNumber } from "@/components/tool/AnimatedNumber";

type Props = {
  anchor: number | null;
  specialty: string | null;
  locale: "ar" | "en";
};

export function QuickPricingWidget({ anchor, specialty, locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  return (
    <div dir={dir} className="rounded-3xl border border-rizq-gold/25 bg-white/70 p-5 sm:p-6 flex flex-col gap-4 transition-[box-shadow,border-color] duration-200 hover:border-rizq-green/25 hover:shadow-sm">
      <div className={`flex items-center justify-between ${font}`}>
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-rizq-green opacity-70" />
          <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
            {isAr ? "تسعيرة سريعة" : "Quick Pricing"}
          </span>
        </div>
        <Link href="/tool" className={`text-xs text-rizq-green hover:underline ${font}`}>
          {isAr ? "أداة التسعير ←" : "Pricing tool →"}
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
          <Link
            href="/tool"
            className={`mt-3 inline-flex items-center gap-1 text-xs text-rizq-green hover:underline ${font}`}
          >
            {isAr ? "استعلم بتفاصيل أكثر" : "Query with more details"}
          </Link>
        </div>
      ) : (
        <div className={`text-center py-3 ${font}`}>
          <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
            {isAr ? "تحقق من سعر السوق لتخصصك." : "Check the market rate for your specialty."}
          </p>
          <Link
            href="/tool"
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-4 py-2 text-sm font-medium hover:bg-rizq-green-dark transition-colors ${font}`}
          >
            {isAr ? "احسب سعرك ←" : "Check market rate →"}
          </Link>
        </div>
      )}
    </div>
  );
}
