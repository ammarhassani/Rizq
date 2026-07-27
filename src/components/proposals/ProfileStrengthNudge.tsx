import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import { OPTIMAL_THRESHOLD } from "@/lib/profile/strength";
import { fmtCount } from "@/lib/format/number";

/**
 * Small profile-strength nudge (feature 009) shown where the retired studio-profile button was.
 * Encourages weaker profiles to complete their KYC — and stays SILENT (renders null) once the
 * profile is already strong (>= OPTIMAL_THRESHOLD), so a complete profile is never nagged.
 */
type Props = {
  locale: "ar" | "en";
  strength: number;
};

export function ProfileStrengthNudge({ locale, strength }: Props) {
  if (strength >= OPTIMAL_THRESHOLD) return null;

  const tI18n = useTranslations("Proposals.detail");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <Link
      href="/settings/profile"
      className={`inline-flex items-center gap-2.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-2.5 text-sm text-rizq-ink hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
    >
      <Sparkles size={16} strokeWidth={1.7} className="text-rizq-gold shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="tabular font-semibold text-rizq-green">{fmtCount(strength, locale)}%</span>{" "}
        {tI18n("profileStrengthCompleteStrongerWork")}
      </span>
      <ArrowRight size={15} className="shrink-0 rtl:rotate-180" aria-hidden="true" />
    </Link>
  );
}
