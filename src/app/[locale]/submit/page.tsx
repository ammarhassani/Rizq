import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { SubmitForm } from "@/components/submit/SubmitForm";
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

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login?returnTo=/${locale}/submit`);
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
        />
      </main>
    </div>
  );
}
