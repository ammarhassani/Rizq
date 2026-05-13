"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

type Props = {
  locale: "ar" | "en";
  onReset: () => void;
};

export function InsufficientCard({ locale, onReset }: Props) {
  const t = useTranslations("Tool.insufficient");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <div className="rounded-3xl border border-rizq-gold/30 bg-rizq-cream/85 p-7 sm:p-10 text-center animate-fade-in">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rizq-gold/40 bg-rizq-cream text-rizq-gold-dark mx-auto mb-5">
        <Search size={22} strokeWidth={1.6} />
      </span>
      <h3 className={`text-xl sm:text-2xl text-rizq-ink font-semibold mb-3 ${font}`}>
        {t("title")}
      </h3>
      <p className={`text-base text-rizq-ink-soft max-w-md mx-auto mb-6 ${font}`}>
        {t("body")}
      </p>
      <button
        type="button"
        onClick={onReset}
        className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm hover:bg-rizq-green-dark transition-all ${font}`}
      >
        <span>{t("tryAgain")}</span>
      </button>
    </div>
  );
}
