/**
 * /[locale]/settings/profile — Profile as the single KYC source of truth (feature 009).
 * The one place a freelancer completes/backfills their whole profile, with a strength meter +
 * "what's missing" checklist over the reused onboarding section editors + a testimonials section.
 * Server component; auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { loadProfileSnapshot } from "@/lib/profile/snapshot";
import { computeStrength, strengthItems } from "@/lib/profile/strength";
import { listTestimonials } from "@/app/actions/proposals/testimonials";
import { ProfileStrengthPanel } from "@/components/settings/ProfileStrengthPanel";
import { ProfileSections } from "@/components/settings/ProfileSections";
import { ArrowLeft } from "lucide-react";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  return { title: `${isAr ? "ملفك المهني" : "Your profile"} · رِزق` };
}

export default async function SettingsProfilePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(getPathname({ href: "/login", locale: locale as "ar" | "en" }));
  }

  const { snapshot } = await loadProfileSnapshot(supabase, user.id);
  const strength = computeStrength(snapshot);
  const items = strengthItems(snapshot);
  const testimonialsResult = await listTestimonials();
  const testimonials = testimonialsResult.ok ? testimonialsResult.testimonials : [];

  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "ملفك المهني" : "Your profile"} maxWidth="reading">
      <div dir={dir} className={font}>
        <Link
          href="/settings"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors mb-4 ${font}`}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {isAr ? "الإعدادات" : "Settings"}
        </Link>

        <div className="mb-6">
          <p className="eyebrow mb-2">{isAr ? "ملفك المهني" : "Your profile"}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>
            {isAr ? "أكمل ملفك" : "Complete your profile"}
          </h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-xl ${font}`}>
            {isAr
              ? "كل بياناتك المهنية في مكان واحد. كلما اكتمل ملفك، كانت عروضك وفواتيرك وتسعيرك أدق."
              : "All your professional data in one place. The more complete your profile, the sharper your proposals, invoices, and pricing."}
          </p>
        </div>

        <div className="mb-6">
          <ProfileStrengthPanel locale={locale as "ar" | "en"} strength={strength} items={items} />
        </div>

        <ProfileSections locale={locale as "ar" | "en"} snapshot={snapshot} testimonials={testimonials} />
      </div>
    </AppShell>
  );
}
