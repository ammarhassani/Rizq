import { getTranslations } from "next-intl/server";
import { BriefcaseBusiness, MapPin, Scale } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function HowItWorks({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "HowItWorks" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const numberFormat = new Intl.NumberFormat(
    isAr ? "ar-SA" : "en-US",
    { minimumIntegerDigits: 2 }
  );

  const steps = [
    { icon: BriefcaseBusiness, title: t("step1Title"), body: t("step1Body") },
    { icon: MapPin, title: t("step2Title"), body: t("step2Body") },
    { icon: Scale, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative border-t border-rizq-gold/20"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        {/* Section intro */}
        <Reveal>
          <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10 mb-16 sm:mb-20">
            <div className="col-span-12 lg:col-span-7">
              <p className="eyebrow mb-6">{t("eyebrow")}</p>
              <h2
                id="how-heading"
                className={`display-2 text-rizq-ink ${font}`}
              >
                {t("heading")}
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-4 lg:col-start-9 flex items-end">
              <p className={`mt-6 lg:mt-0 text-lg text-rizq-ink-soft leading-relaxed ${font}`}>
                {t("subheading")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Steps grid — each step reveals independently with a stagger */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-14 lg:gap-x-16">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li key={idx} className="relative group">
                {idx > 0 && (
                  <span
                    aria-hidden
                    className="absolute top-0 -start-5 lg:-start-8 h-full w-px bg-rizq-gold/15 hidden md:block"
                  />
                )}
                <Reveal delay={idx * 0.12}>
                  <div className="flex items-start justify-between mb-8">
                    <span className="section-numeral tabular">
                      {numberFormat.format(idx + 1)}
                    </span>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rizq-green/15 bg-rizq-cream/80 text-rizq-green transition-colors group-hover:border-rizq-green/40 group-hover:bg-rizq-green/5">
                      <Icon strokeWidth={1.4} size={20} />
                    </span>
                  </div>

                  <h3
                    className={`text-2xl sm:text-[1.65rem] leading-snug text-rizq-ink font-semibold mb-4 ${font}`}
                  >
                    {step.title}
                  </h3>
                  <p className={`text-base sm:text-lg leading-relaxed text-rizq-ink-soft ${font}`}>
                    {step.body}
                  </p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
