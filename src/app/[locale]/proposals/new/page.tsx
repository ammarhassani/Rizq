/**
 * /[locale]/proposals/new — Proposal generate flow page.
 * Phase-2 task 2.9.
 *
 * Server component. Auth-gated: redirects to /[locale]/login when not signed in.
 * Loads reference data (cities, tiers) for the form selects.
 * Passes defaultCitySlug derived from the user's stored city preference.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCities, getExperienceTiers } from "@/lib/pricing/refDataDb";
import { listTemplates } from "@/app/actions/proposals/templates";
import { AppShell } from "@/components/shell/AppShell";
import { ProposalFlow } from "@/components/proposals/ProposalFlow";

// Studio's generateProposal Server Action runs the heaviest AI call (scope
// extraction: large few-shot prompt + complex schema). Give it room so Vercel
// doesn't kill the function before the 20s AI abort.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Params = { locale: string };

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Proposals.new" });
  return { title: `${t("title")} · رِزق` };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalNewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Auth gate
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({
      href: "/login",
      locale: locale as "ar" | "en",
    });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Proposals.new" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  // Load ref data + templates + clients in parallel
  const [cities, tiers, templatesResult, clientsRaw] = await Promise.all([
    getCities(),
    getExperienceTiers(),
    listTemplates(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);
  const userTemplates = templatesResult.ok ? templatesResult.templates : [];
  const userClients = (clientsRaw.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  // Load user profile for default city
  const { data: userProfile } = await supabase
    .from("users")
    .select("city")
    .eq("id", userData.user.id)
    .single();

  // Map stored city text to a slug: find the city whose name_ar or name_en
  // matches the stored value, fall back to first active city.
  const storedCity = (userProfile?.city as string | null) ?? null;
  const defaultCitySlug = (() => {
    if (!storedCity) return cities[0]?.slug ?? "";
    const match = cities.find(
      (c) =>
        c.name_ar === storedCity ||
        c.name_en === storedCity ||
        c.slug === storedCity
    );
    return match?.slug ?? cities[0]?.slug ?? "";
  })();

  // Map to option shape with locale-aware labels
  const cityOptions = cities.map((c) => ({
    slug: c.slug,
    label: isAr ? c.name_ar : c.name_en,
  }));

  const tierOptions = tiers.map((tier) => ({
    slug: tier.slug,
    label: isAr ? tier.name_ar : tier.name_en,
    hint: tierYears(tier.years_min, tier.years_max, locale as "ar" | "en"),
  }));

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "عرض جديد" : "New Proposal"} maxWidth="reading">
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
          <p className={`mt-3 text-base sm:text-lg text-rizq-ink-soft max-w-xl ${font}`}>
            {t("subtitle")}
          </p>
        </div>

        {/* Client orchestrator */}
        <ProposalFlow
          locale={locale as "ar" | "en"}
          specialties={[]} /* specialty is AI-detected from brief — no manual select */
          cities={cityOptions}
          tiers={tierOptions}
          defaultCitySlug={defaultCitySlug}
          templates={userTemplates.map((t) => ({
            id: t.id,
            name_ar: t.name_ar,
            name_en: t.name_en,
          }))}
          clients={userClients}
        />
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierYears(min: number, max: number | null, locale: "ar" | "en"): string {
  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format;
  if (max === null) return locale === "ar" ? `${fmt(min)}+ سنوات` : `${fmt(min)}+ yrs`;
  if (min === max) return locale === "ar" ? `${fmt(min)} سنة` : `${fmt(min)} yr`;
  return locale === "ar" ? `${fmt(min)} إلى ${fmt(max)} سنوات` : `${fmt(min)} to ${fmt(max)} yrs`;
}
