"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Footer");
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <Link
      href={pathname}
      locale={otherLocale}
      className="group inline-flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-rizq-ink-soft hover:text-rizq-green transition-colors"
      aria-label={`Switch to ${otherLocale === "ar" ? "Arabic" : "English"}`}
    >
      <span className="block h-px w-6 bg-rizq-gold/60 group-hover:bg-rizq-green transition-colors" />
      <span className={otherLocale === "ar" ? "font-arabic" : "font-sans"}>
        {t("langToggleLabel")}
      </span>
    </Link>
  );
}
