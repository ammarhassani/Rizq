import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/nav/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { AppsGrid } from "@/components/landing/AppsGrid";
import { IntegrationsFlow } from "@/components/landing/IntegrationsFlow";
import { AiFeatures } from "@/components/landing/AiFeatures";
import { FeatureDemos } from "@/components/landing/FeatureDemos";
import { Trust } from "@/components/landing/Trust";
import { Pricing } from "@/components/landing/Pricing";
import { FounderNote } from "@/components/landing/FounderNote";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { SiteFooter } from "@/components/landing/SiteFooter";

// HowItWorks is intentionally dropped: AppsGrid covers the "what is Rizq" purpose
// with a concrete, scannable module list; AiFeatures covers the "how" for AI-powered
// features. Keeping HowItWorks would duplicate the AppsGrid story without adding
// new information for a visitor who can now see the 13 modules directly.

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
        {/* 1. Hero — رِزق glyph LCP, primary + secondary CTAs */}
        <Hero locale={locale} />

        {/* 2. Apps grid — all 13 modules, flat Odoo-style marketplace */}
        <AppsGrid locale={locale} />

        {/* 3. IntegrationsFlow — "كل شيء متصل" RTL scroll-draw flow */}
        <IntegrationsFlow locale={locale} />

        {/* 4. AI Features band — تحليل رِزق with honesty label */}
        <AiFeatures locale={locale} />

        {/* 5. FeatureDemos — three interactive client-side mini demos */}
        <FeatureDemos locale={locale} />

        {/* 6. Trust pillars — methodology, halal, data-ownership */}
        <Trust locale={locale} />

        {/* 7. Pricing plans */}
        <Pricing locale={locale} />

        {/* 8. Founder note */}
        <FounderNote locale={locale} />

        {/* 9. FAQ */}
        <Faq locale={locale} />

        {/* 10. Final CTA — conversion band replaces waitlist */}
        <FinalCta locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
