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
import { getQuotaState } from "@/lib/pricing/quota";
import { ToolFlow } from "@/components/tool/ToolFlow";
import { QuotaBadge } from "@/components/tool/QuotaBadge";

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
  // Limit (3 + bonus_quota for free; 1 for anon; "unlimited" for pro/admin).
  // Passing this to QuotaBadge keeps it in sync with the dashboard.
  const limit = typeof quota.limit === "number" ? quota.limit : 3;

  const isAr = locale === "ar";

  return (
    <AppShell
      locale={locale}
      title={isAr ? "أداة التسعير" : "Pricing Tool"}
      maxWidth="reading"
    >
      <div dir={isAr ? "rtl" : "ltr"}>
        <div className="mb-7 sm:mb-9 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t("eyebrow")}</p>
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
            <p className={`mt-3 text-base sm:text-lg text-rizq-ink-soft max-w-xl ${font}`}>
              {t("subtitle")}
            </p>
          </div>
          <div className="shrink-0">
            <QuotaBadge locale={locale} mode={mode} remaining={remaining} limit={limit} />
          </div>
        </div>

        <ToolFlow
          locale={locale}
          specialties={specialtyOptions}
          cities={cityOptions}
          tiers={tierOptions}
          canShare={isAuth}
          isAuthed={isAuth}
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
