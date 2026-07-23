import { getTranslations } from "next-intl/server";

type Props = {
  locale: "ar" | "en";
  mode: "anon" | "free" | "pro" | "admin";
  remaining: number | "unlimited";
  limit?: number;
};

export async function QuotaBadge({ locale, mode, remaining, limit = 3 }: Props) {
  const t = await getTranslations({ locale, namespace: "Tool.quota" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");
  let label: string;
  let tone: "neutral" | "warn" | "good" = "neutral";
  if (mode === "pro" || mode === "admin" || remaining === "unlimited") {
    label = t("pro");
    tone = "good";
  } else if (mode === "anon") {
    label = t("anonRemaining");
    tone = remaining === 0 ? "warn" : "neutral";
  } else {
    label = t("freeRemaining", {
      remaining: fmt.format(remaining),
      limit: fmt.format(limit),
    });
    tone = remaining === 0 ? "warn" : remaining === 1 ? "neutral" : "good";
  }

  const toneClass =
    tone === "good"
      ? "border-rizq-green/30 bg-rizq-green/5 text-rizq-green"
      : tone === "warn"
        ? "border-[var(--warn-line)] bg-[var(--warn-soft)] text-amber-800"
        : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs tracking-wide ${toneClass} ${font}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </span>
  );
}
