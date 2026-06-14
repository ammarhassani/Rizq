import { getTranslations } from "next-intl/server";
import { BookOpen, ShieldCheck, Database } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { RizqSeal } from "@/components/proposals/RizqSeal";

type Props = { locale: "ar" | "en" };

const PILLAR_ICONS = [BookOpen, ShieldCheck, Database];

export async function Trust({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const pillars = [
    { titleKey: "trust.p1Title", bodyKey: "trust.p1Body" },
    { titleKey: "trust.p2Title", bodyKey: "trust.p2Body" },
    { titleKey: "trust.p3Title", bodyKey: "trust.p3Body" },
  ] as const;

  return (
    <section
      aria-labelledby="trust-heading"
      className="relative border-t border-rizq-gold/20 bg-paper"
    >
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20 lg:py-24">
        {/* Section header + seal side by side on large screens */}
        <Reveal>
          <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10 mb-10 sm:mb-14 items-center">
            <div className="col-span-12 lg:col-span-8">
              <p className={`eyebrow mb-4 ${font}`}>{t("trust.eyebrow")}</p>
              <h2
                id="trust-heading"
                className={`display-2 text-rizq-ink ${font}`}
              >
                {t("trust.heading")}
              </h2>
            </div>
            {/* Seal — decorative, aria-hidden is on the SVG itself */}
            <div className="col-span-12 lg:col-span-4 flex justify-start lg:justify-end mt-8 lg:mt-0">
              <RizqSeal size={80} locale={locale} />
            </div>
          </div>
        </Reveal>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-8 lg:gap-10">
          {pillars.map(({ titleKey, bodyKey }, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <Reveal key={i} delay={i * 0.1}>
                <div className="flex flex-col gap-4">
                  {/* Icon tile */}
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rizq-green/20 bg-rizq-green/6 text-rizq-green"
                    aria-hidden
                  >
                    <Icon size={22} strokeWidth={1.4} />
                  </span>

                  {/* Gold rule */}
                  <div className="rule-gold-h h-px w-12" aria-hidden />

                  <h3
                    className={`text-xl sm:text-2xl font-semibold text-rizq-ink leading-snug ${font}`}
                  >
                    {t(titleKey)}
                  </h3>

                  <p className={`text-base leading-relaxed text-rizq-ink-soft ${font}`}>
                    {t(bodyKey)}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Methodology CTA */}
        <Reveal delay={0.32}>
          <div className="mt-10 sm:mt-12">
            <Link
              href="/methodology"
              className={`inline-flex items-center gap-2 text-sm font-medium text-rizq-green hover:text-rizq-green-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 rounded-sm ${font}`}
            >
              <span>{t("trust.methodologyCta")}</span>
              <span className="rtl:rotate-180" aria-hidden>→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
