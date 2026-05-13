import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/nav/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FounderNote } from "@/components/landing/FounderNote";
import { Waitlist } from "@/components/landing/Waitlist";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <SiteNav locale={locale} />
      <main>
        <Hero locale={locale} />
        <HowItWorks locale={locale} />
        <Pricing locale={locale} />
        <Faq locale={locale} />
        <FounderNote locale={locale} />
        <Waitlist locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
