"use client";

import { useTranslations } from "next-intl";

/**
 * Visually-hidden, localized status text for the ShellSkeleton loading
 * fallback. `loading.tsx` files don't receive the `locale` param, but this
 * client child reads it from the NextIntlClientProvider (present in the locale
 * layout), so the announced label is correct in both Arabic and English.
 *
 * The parent skeleton owns role="status"/aria-busy; this just supplies the
 * accessible name as live text for screen readers.
 */
export function ShellSkeletonLabel() {
  const t = useTranslations("AppShell");
  return <span className="sr-only">{t("loading.page")}</span>;
}
