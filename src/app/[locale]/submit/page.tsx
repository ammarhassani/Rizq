import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { SubmitForm, type SubmitPrefill } from "@/components/submit/SubmitForm";
import {
  getSpecialties,
  getCities,
  getExperienceTiers,
} from "@/lib/pricing/refDataDb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Submit" });
  return { title: `${t("title")} — رِزق` };
}

type PrefillRow = {
  id: string;
  status: string;
  user_id: string;
  project_type: string | null;
  project_size: string | null;
  price_sar: string | number;
  project_duration_days: number | null;
  client_type: string | null;
  notes: string | null;
  moderator_notes: string | null;
  specialty: { slug: string } | null;
  city: { slug: string } | null;
  experience_tier: { slug: string } | null;
};

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ resubmit?: string }>;
}) {
  const { locale } = await params;
  const { resubmit } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = resubmit
      ? `/${locale}/submit?resubmit=${resubmit}`
      : `/${locale}/submit`;
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(next)}`);
  }

  // If ?resubmit=<id>, fetch the submission. Must belong to user and be in
  // needs_info — otherwise drop to a regular submit form.
  let prefill: SubmitPrefill | undefined;
  if (resubmit && /^[0-9a-f-]{36}$/i.test(resubmit)) {
    const { data } = await supabase
      .from("pricing_submissions")
      .select(
        `id, status, user_id, project_type, project_size, price_sar,
         project_duration_days, client_type, notes, moderator_notes,
         specialty:specialties (slug),
         city:cities (slug),
         experience_tier:experience_tiers (slug)`
      )
      .eq("id", resubmit)
      .maybeSingle();
    const row = data as unknown as PrefillRow | null;
    if (
      row &&
      row.user_id === user.id &&
      row.status === "needs_info" &&
      row.specialty &&
      row.city &&
      row.experience_tier
    ) {
      prefill = {
        submission_id: row.id,
        specialty_slug: row.specialty.slug,
        city_slug: row.city.slug,
        experience_tier_slug: row.experience_tier.slug,
        project_type: row.project_type ?? "",
        project_size:
          (row.project_size as SubmitPrefill["project_size"]) ?? "",
        price_sar: Number(row.price_sar),
        project_duration_days: row.project_duration_days ?? "",
        client_type:
          (row.client_type as SubmitPrefill["client_type"]) ?? "",
        notes: row.notes ?? "",
        moderator_notes: row.moderator_notes,
      };
    }
  }

  const [specialties, cities, tiers] = await Promise.all([
    getSpecialties(),
    getCities(),
    getExperienceTiers(),
  ]);

  const t = await getTranslations({ locale, namespace: "Submit" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

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
  }));

  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteNav locale={locale as "ar" | "en"} />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-2xl px-6 sm:px-10 lg:px-12 py-12 sm:py-16">
        <p className="eyebrow mb-4">{t("eyebrow")}</p>
        <h1 className={`display-2 text-rizq-ink mb-4 ${font}`}>{t("title")}</h1>
        <p className={`text-base sm:text-lg text-rizq-ink-soft leading-relaxed mb-10 max-w-xl ${font}`}>
          {t("subtitle")}
        </p>

        <SubmitForm
          locale={locale as "ar" | "en"}
          userId={user.id}
          specialties={specialtyOptions}
          cities={cityOptions}
          tiers={tierOptions}
          prefill={prefill}
        />
      </main>
    </div>
  );
}
