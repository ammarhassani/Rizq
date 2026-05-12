import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function Pricing({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Pricing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const freeFeatures = [
    t("free.feature1"),
    t("free.feature2"),
    t("free.feature3"),
    t("free.feature4"),
  ];

  const proFeatures = [
    t("pro.feature1"),
    t("pro.feature2"),
    t("pro.feature3"),
    t("pro.feature4"),
    t("pro.feature5"),
  ];

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative border-t border-rizq-gold/20"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        {/* Section intro */}
        <Reveal>
          <div className="max-w-3xl mb-16 sm:mb-20">
            <p className="eyebrow mb-6">{t("eyebrow")}</p>
            <h2
              id="pricing-heading"
              className={`display-2 text-rizq-ink mb-6 ${font}`}
            >
              {t("heading")}
            </h2>
            <p className={`text-lg text-rizq-ink-soft leading-relaxed ${font}`}>
              {t("subheading")}
            </p>
          </div>
        </Reveal>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-0 relative">
          {/* Vertical gold rule between columns (lg+) */}
          <span
            aria-hidden
            className="hidden lg:block absolute top-6 bottom-6 start-1/2 w-px rule-gold"
          />

          {/* Free */}
          <Reveal>
            <article className="relative lg:pe-14 xl:pe-20 lg:py-2">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className={`text-2xl text-rizq-ink font-semibold ${font}`}>
                {t("free.name")}
              </h3>
              <span
                className={`text-xs tracking-[0.18em] uppercase text-rizq-ink-soft/60 ${font}`}
              >
                {t("free.tagline")}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-10">
              <span className="font-sans tabular text-7xl sm:text-8xl font-medium text-rizq-ink leading-none">
                {t("free.price")}
              </span>
              <span className={`text-base text-rizq-ink-soft/80 ${font}`}>
                {t("free.period")}
              </span>
            </div>

            <ul className="space-y-4 mb-12">
              {freeFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    size={18}
                    strokeWidth={1.6}
                    className="text-rizq-green mt-1 shrink-0"
                  />
                  <span className={`text-base text-rizq-ink leading-relaxed ${font}`}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#waitlist"
              className={`inline-flex items-center gap-2 text-rizq-green border-b border-rizq-green/30 pb-1 hover:border-rizq-green transition-colors ${font}`}
            >
              <span>{t("free.cta")}</span>
              <span className="inline-block rtl:rotate-180">→</span>
            </a>
            </article>
          </Reveal>

          {/* Pro */}
          <Reveal delay={0.12}>
            <article className="relative lg:ps-14 xl:ps-20 lg:py-2">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className={`text-2xl text-rizq-ink font-semibold ${font}`}>
                {t("pro.name")}
              </h3>
              <span
                className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark ${font}`}
              >
                {t("pro.badge")}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-sans tabular text-7xl sm:text-8xl font-semibold text-rizq-green leading-none">
                {t("pro.price")}
              </span>
              <span className={`text-base text-rizq-ink-soft/80 ${font}`}>
                {t("pro.period")}
              </span>
            </div>
            <p className={`text-sm text-rizq-ink-soft/70 mb-10 ${font}`}>
              {t("pro.tagline")}
            </p>

            <ul className="space-y-4 mb-12">
              {proFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check
                    size={18}
                    strokeWidth={1.8}
                    className="text-rizq-green mt-1 shrink-0"
                  />
                  <span className={`text-base text-rizq-ink leading-relaxed ${font}`}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="#waitlist"
              className={`group inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium shadow-[0_2px_0_0_var(--color-rizq-green-dark)] hover:bg-rizq-green-dark transition-all hover:shadow-[0_4px_16px_-4px_rgba(26,95,63,0.45)] hover:-translate-y-0.5 ${font}`}
            >
              <span>{t("pro.cta")}</span>
              <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                →
              </span>
            </a>
            </article>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <p className={`mt-14 text-xs tracking-[0.18em] uppercase text-rizq-gold-dark/80 ${font}`}>
            {t("halalNote")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
