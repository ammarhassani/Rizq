"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Lock } from "lucide-react";

type Props = {
  locale: "ar" | "en";
  mode: "anon" | "free";
};

export function QuotaExhaustedCard({ locale, mode }: Props) {
  const t = useTranslations("Tool.quota");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const isAnon = mode === "anon";
  const title = isAnon ? t("anonExhaustedTitle") : t("freeExhaustedTitle");
  const body = isAnon ? t("anonExhaustedBody") : t("freeExhaustedBody");
  const cta = isAnon ? t("anonExhaustedCta") : t("freeExhaustedCta");
  const href = isAnon ? "/signup" : "/dashboard"; // upgrade flow lives in Sprint 4 — for now nudge to dashboard

  return (
    <div className="rounded-3xl border border-rizq-gold/30 bg-rizq-cream/85 p-7 sm:p-10 text-center animate-fade-in">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rizq-gold/40 bg-rizq-cream text-rizq-gold-dark mx-auto mb-5">
        <Lock size={22} strokeWidth={1.6} />
      </span>
      <h3 className={`text-xl sm:text-2xl text-rizq-ink font-semibold mb-3 ${font}`}>
        {title}
      </h3>
      <p className={`text-base text-rizq-ink-soft max-w-md mx-auto mb-6 ${font}`}>
        {body}
      </p>
      <Link
        href={href}
        className={`group inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
      >
        <span>{cta}</span>
        <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
          →
        </span>
      </Link>
    </div>
  );
}
