import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AppShell } from "@/components/shell/AppShell";
import { createClient } from "@/lib/supabase/server";
import {
  getSpecialties,
  getCities,
  getExperienceTiers,
} from "@/lib/pricing/refDataDb";
import { getQuotaState, FREE_MONTHLY_QUERIES } from "@/lib/pricing/quota";
import { ToolFlow } from "@/components/tool/ToolFlow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tool" });
  return { title: `${t("title")} · رِزق` };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Tool" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Pull reference data + quota in parallel
  const [specialties, cities, tiers, quota, supabase] = await Promise.all([
    getSpecialties(),
    getCities(),
    getExperienceTiers(),
    getQuotaState(),
    createClient(),
  ]);
  const { data: userData } = await supabase.auth.getUser();
  const isAuth = !!userData.user;

  // Feature 006: the profile is the source of truth. Onboarding already captured these
  // three, so the tool opens ready to run rather than asking for them again.
  let profilePrefill:
    | { specialtySlug: string | null; citySlug: string | null; tierSlug: string | null }
    | undefined;
  // What they said they charge, so the result can place them inside the band instead of
  // handing over a 3.5x spread and leaving the decision entirely to them.
  let statedRange: { min: number; max: number } | null = null;

  if (userData.user) {
    const { data: profileRow } = await supabase
      .from("users")
      .select(
        "current_project_rate_range, primary_specialty:specialties!primary_specialty_id(slug), city:cities!city_id(slug), tier:experience_tiers!experience_tier_id(slug)"
      )
      .eq("id", userData.user.id)
      .maybeSingle();

    // Supabase types an embedded to-one join as an array in some shapes; normalise both.
    const slugOf = (rel: unknown): string | null => {
      const node = Array.isArray(rel) ? rel[0] : rel;
      const slug = (node as { slug?: unknown } | null)?.slug;
      return typeof slug === "string" ? slug : null;
    };

    if (profileRow) {
      profilePrefill = {
        specialtySlug: slugOf(profileRow.primary_specialty),
        citySlug: slugOf(profileRow.city),
        tierSlug: slugOf(profileRow.tier),
      };
      // jsonb — onboarding writes {min, max}, and a single figure arrives as min === max.
      const raw = profileRow.current_project_rate_range as
        | { min?: unknown; max?: unknown }
        | null;
      if (raw && typeof raw.min === "number" && typeof raw.max === "number") {
        statedRange = { min: raw.min, max: raw.max };
      }
    }
  }

  // Map ref data to ToolFlow Option shape with locale-aware labels
  const specialtyOptions = specialties.map((s) => ({
    slug: s.slug,
    label: locale === "ar" ? s.name_ar : s.name_en,
  }));
  const cityOptions = cities.map((c) => ({
    slug: c.slug,
    label: locale === "ar" ? c.name_ar : c.name_en,
  }));
  const tierOptions = tiers.map((t2) => ({
    slug: t2.slug,
    label: locale === "ar" ? t2.name_ar : t2.name_en,
    hint: tierYears(t2.years_min, t2.years_max, locale, t),
  }));

  // If the quota is already exhausted on page load, render that view directly
  const quotaExhausted = !quota.ok;
  const mode = quota.ok
    ? quota.mode
    : ((quota.cta === "signup" ? "anon" : "free") as "anon" | "free");
  const remaining = quota.ok ? quota.remaining : 0;
  // Limit (FREE_MONTHLY_QUERIES + bonus_quota for free; 1 for anon; "unlimited" for
  // pro/admin, where the badge shows the Pro label and ignores this). Passing it through
  // keeps the badge in sync with the dashboard.
  const limit = typeof quota.limit === "number" ? quota.limit : FREE_MONTHLY_QUERIES;

  const isAr = locale === "ar";

  return (
    <AppShell
      locale={locale}
      title={t("pricingTool")}
      maxWidth="reading"
    >
      <div dir={isAr ? "rtl" : "ltr"}>
        {/* Heading + allowance badge live inside ToolFlow so the badge can follow what the
            pricing action actually enforced, without a page reload. */}
        <ToolFlow
          locale={locale}
          specialties={specialtyOptions}
          cities={cityOptions}
          tiers={tierOptions}
          canShare={isAuth}
          isAuthed={isAuth}
          profilePrefill={profilePrefill}
          statedRange={statedRange}
          quota={{ mode, remaining, limit }}
          header={
            <div>
              <p className="eyebrow mb-3">{t("eyebrow")}</p>
              <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
              <p className={`mt-3 text-base sm:text-lg text-rizq-ink-soft max-w-xl ${font}`}>
                {t("subtitle")}
              </p>
            </div>
          }
        />

        {/* If quota was already exhausted server-side, the ToolFlow's quota
            branch fires only after submit; surface the exhausted state up-front. */}
        {quotaExhausted && (
          <p className={`mt-6 text-center text-sm text-rizq-ink-soft/70 ${font}`}>
            {/* The card itself appears once the user submits — keep this row light */}
          </p>
        )}
      </div>
    </AppShell>
  );
}

function tierYears(
  min: number,
  max: number | null,
  locale: "ar" | "en",
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format;
  if (max === null) return t("tierYearsPlus", { min: fmt(min) });
  if (min === max) return t("tierYearsExact", { min: fmt(min) });
  return t("tierYearsRange", { min: fmt(min), max: fmt(max) });
}
