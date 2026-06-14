import { SiteNav } from "@/components/nav/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { ValueProps } from "@/components/landing/ValueProps";
import { StatsBand } from "@/components/landing/StatsBand";
import { AppsGrid } from "@/components/landing/AppsGrid";
import { WorkflowStory } from "@/components/landing/WorkflowStory";
import { AiFeatures } from "@/components/landing/AiFeatures";
import { FeatureDemos } from "@/components/landing/FeatureDemos";
import { Trust } from "@/components/landing/Trust";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { SiteFooter } from "@/components/landing/SiteFooter";

type Props = { locale: "ar" | "en" };

/**
 * The full marketing landing body, extracted so both the bare locale root
 * (`/[locale]`) and the always-marketing route (`/[locale]/site`) can render
 * the exact same page. Pure server composition — no auth/cookie reads — so it
 * stays SSG-eligible. Auth-aware bits live inside SiteNav's client island.
 *
 * Section order (each is a labelled <section> with its own heading):
 *   1. Hero            — رِزق glyph LCP, tagline, CTAs, trust chips
 *   2. ValueProps      — "لماذا رِزق؟" four benefit cards
 *   3. StatsBand       — animated real-number strip (13 tools · 25+ AI · …)
 *   4. AppsGrid        — all 13 modules, flat marketplace
 *   5. WorkflowStory   — "from quote to cash" 5-step narrative
 *   6. AiFeatures      — honesty-labeled AI band
 *   7. FeatureDemos    — three interactive product-glimpse demos
 *   8. Trust           — methodology / pricing / data-ownership pillars
 *   9. Pricing         — free vs pro
 *  10. Faq             — common questions
 *  11. FinalCta        — conversion band
 */
export function MarketingLanding({ locale }: Props) {
  return (
    <>
      <SiteNav locale={locale} />
      <main>
        <Hero locale={locale} />
        <ValueProps locale={locale} />
        <StatsBand locale={locale} />
        <AppsGrid locale={locale} />
        <WorkflowStory locale={locale} />
        <AiFeatures locale={locale} />
        <FeatureDemos locale={locale} />
        <Trust locale={locale} />
        <Pricing locale={locale} />
        <Faq locale={locale} />
        <FinalCta locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
