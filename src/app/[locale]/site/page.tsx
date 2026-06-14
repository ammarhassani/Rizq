import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { MarketingLanding } from "@/components/landing/MarketingLanding";

/**
 * `/[locale]/site` — the always-marketing route.
 *
 * The proxy/middleware only redirects signed-in users away from the BARE
 * locale root (`/ar`, `/en`); it does not touch `/ar/site`. So a signed-in
 * user can always reach the public marketing page here (e.g. via an in-app
 * "View site" link), while `/[locale]` keeps its smart redirect into the app.
 *
 * Renders the identical SSG landing as `/[locale]`.
 */
export default async function SiteLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <MarketingLanding locale={locale} />;
}
