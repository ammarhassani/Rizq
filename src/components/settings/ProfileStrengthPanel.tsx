import { type StrengthItem } from "@/lib/profile/strength";
import { CheckCircle2, Circle } from "lucide-react";

/**
 * Profile-strength meter + "what's still missing (+N%)" checklist (feature 009).
 * Presentational — the server page recomputes strength on refresh after a section saves.
 */
type Props = {
  locale: "ar" | "en";
  strength: number;
  items: StrengthItem[];
};

export function ProfileStrengthPanel({ locale, strength, items }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const missing = items.filter((i) => !i.met);

  return (
    <div
      dir={dir}
      className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/70 p-6 sm:p-7 ${font}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm font-semibold text-rizq-ink ${font}`}>
          {isAr ? "قوة ملفك" : "Profile strength"}
        </span>
        <span className="tabular font-sans text-lg font-bold text-rizq-green">{strength}%</span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-rizq-gold/15">
        <div
          className="h-full rounded-full bg-rizq-green transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${Math.max(0, Math.min(100, strength))}%` }}
        />
      </div>

      {missing.length > 0 ? (
        <div className="mt-5">
          <p className={`text-xs font-medium text-rizq-ink-soft mb-2 ${font}`}>
            {isAr ? "أكمل ملفك لتقويته:" : "Complete your profile to strengthen it:"}
          </p>
          <ul className="space-y-1.5">
            {missing.map((m) => (
              <li key={m.key} className={`flex items-center justify-between gap-2 text-sm text-rizq-ink ${font}`}>
                <span className="inline-flex items-center gap-2">
                  <Circle className="h-3.5 w-3.5 text-rizq-ink-soft/40" aria-hidden="true" />
                  {isAr ? m.label_ar : m.label_en}
                </span>
                <span className="tabular text-xs font-medium text-rizq-green">+{m.weight}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={`mt-4 inline-flex items-center gap-2 text-sm text-rizq-green ${font}`}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {isAr ? "ملفك مكتمل بالكامل." : "Your profile is fully complete."}
        </p>
      )}
    </div>
  );
}
