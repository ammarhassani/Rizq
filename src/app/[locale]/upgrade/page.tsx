/**
 * /[locale]/upgrade — Pro upgrade page. Phase-6 P6.6.
 *
 * Server component. Auth-gated: redirects to login when unauthenticated.
 * Fetches the current user's tier via getMyTierAction and passes it to the
 * UpgradePlans client component, which owns all interactivity.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { UpgradePlans } from "@/components/upgrade/UpgradePlans";
import { getMyTierAction } from "@/app/actions/billing/upgrade";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = { locale: string };

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Upgrade" });
  return { title: `${t("pageTitle")} — رِزق` };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UpgradePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Auth gate — redirect to login if not signed in
  const tierResult = await getMyTierAction();
  if (!tierResult.ok) {
    const loginPath = getPathname({
      href: "/login",
      locale: locale as "ar" | "en",
    });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Upgrade" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "ترقية الحساب" : "Upgrade"} maxWidth="reading">
      <div>
        {/* Header */}
        <div className={`mb-8 sm:mb-10 ${isAr ? "text-right" : "text-left"}`}>
          <p className="eyebrow mb-3 text-rizq-green">{t("pageEyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("pageTitle")}</h1>
          <p className={`mt-3 text-base sm:text-lg text-rizq-ink-soft max-w-2xl ${font}`}>
            {t("pageSubtitle")}
          </p>
        </div>

        {/* Plans component — handles all interactivity */}
        <UpgradePlans
          locale={locale as "ar" | "en"}
          isPro={tierResult.isPro}
          pro_until={tierResult.pro_until}
        />
      </div>
    </AppShell>
  );
}
