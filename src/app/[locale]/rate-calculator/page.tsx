/**
 * /[locale]/rate-calculator — Rate Calculator (M10). Phase-6 task P6.3.
 * Server component. Auth-gated.
 * Loads: ref-table options, user profile prefill, saved defaults, 3-month
 * income average. Passes everything to the client component.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { RateCalculatorClient } from "@/components/rate/RateCalculatorClient";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RateCalculator" });
  return { title: `${t("pageTitle")} — رِزق` };
}

export type SpecialtyOption = { id: string; slug: string; name_ar: string; name_en: string };
export type CityOption = { id: string; slug: string; name_ar: string; name_en: string };
export type TierOption = { id: string; slug: string; name_ar: string; name_en: string };

export type RateDefaults = {
  monthly_target_sar: number | null;
  working_days_per_month: number;
  hours_per_day: number;
  projects_per_month_target: number | null;
  specialty_id: string | null;
  city_id: string | null;
  experience_tier_id: string | null;
};

export default async function RateCalculatorPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const userId = userData.user.id;
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const t = await getTranslations({ locale, namespace: "RateCalculator" });

  // ── Load ref table options in parallel ────────────────────────────────────
  const [specialtiesRes, citiesRes, tiersRes, profileRes, defaultsRes, incomeRes] =
    await Promise.all([
      supabase
        .from("specialties")
        .select("id, slug, name_ar, name_en")
        .eq("active", true)
        .order("name_ar"),
      supabase
        .from("cities")
        .select("id, slug, name_ar, name_en")
        .eq("active", true)
        .order("name_ar"),
      supabase
        .from("experience_tiers")
        .select("id, slug, name_ar, name_en")
        .order("id"),
      supabase
        .from("users")
        .select("primary_specialty_id, city_id, experience_tier_id")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("rate_calculator_defaults")
        .select(
          "monthly_target_sar, working_days_per_month, hours_per_day, projects_per_month_target, specialty_id, city_id, experience_tier_id"
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("monthly_income")
        .select("paid_sar")
        .gte(
          "month",
          new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString()
        )
        .order("month", { ascending: false })
        .limit(3),
    ]);

  const specialties: SpecialtyOption[] = (specialtiesRes.data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name_ar: r.name_ar as string,
    name_en: r.name_en as string,
  }));

  const cities: CityOption[] = (citiesRes.data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name_ar: r.name_ar as string,
    name_en: r.name_en as string,
  }));

  const tiers: TierOption[] = (tiersRes.data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name_ar: r.name_ar as string,
    name_en: r.name_en as string,
  }));

  // Compute 3-month average income
  const incomeRows = incomeRes.data ?? [];
  const avg3moIncome =
    incomeRows.length > 0
      ? Math.round(
          incomeRows.reduce((s, r) => s + ((r.paid_sar as number) ?? 0), 0) /
            incomeRows.length
        )
      : null;

  // Determine prefill: saved defaults > user profile > hardcoded
  const saved = defaultsRes.data;
  const profile = profileRes.data;

  const defaults: RateDefaults = {
    monthly_target_sar: (saved?.monthly_target_sar as number | null) ?? null,
    working_days_per_month:
      (saved?.working_days_per_month as number | null) ?? 22,
    hours_per_day: (saved?.hours_per_day as number | null) ?? 6,
    projects_per_month_target:
      (saved?.projects_per_month_target as number | null) ?? null,
    specialty_id:
      (saved?.specialty_id as string | null) ??
      (profile?.primary_specialty_id as string | null) ??
      null,
    city_id:
      (saved?.city_id as string | null) ??
      (profile?.city_id as string | null) ??
      null,
    experience_tier_id:
      (saved?.experience_tier_id as string | null) ??
      (profile?.experience_tier_id as string | null) ??
      null,
  };

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "حاسبة السعر" : "Rate Calculator"} maxWidth="form">
      <div className={font} dir={isAr ? "rtl" : "ltr"}>
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {t("backToDashboard")}
        </Link>

        <h1
          className={`text-2xl sm:text-3xl font-bold text-rizq-green mb-2 ${font}`}
        >
          {t("pageTitle")}
        </h1>
        <p className={`text-sm text-rizq-ink-soft mb-8 ${font}`}>
          {t("pageSubtitle")}
        </p>

        <RateCalculatorClient
          locale={locale as "ar" | "en"}
          specialties={specialties}
          cities={cities}
          tiers={tiers}
          defaults={defaults}
          avg3moIncome={avg3moIncome}
        />
      </div>
    </AppShell>
  );
}
