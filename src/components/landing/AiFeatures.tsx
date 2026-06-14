import { getTranslations } from "next-intl/server";
import { Tag, FileText, TrendingUp, Bell } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

const FEATURE_ICONS = [Tag, FileText, TrendingUp, Bell];

export async function AiFeatures({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const features = [
    { titleKey: "aiFeatures.f1Title", bodyKey: "aiFeatures.f1Body" },
    { titleKey: "aiFeatures.f2Title", bodyKey: "aiFeatures.f2Body" },
    { titleKey: "aiFeatures.f3Title", bodyKey: "aiFeatures.f3Body" },
    { titleKey: "aiFeatures.f4Title", bodyKey: "aiFeatures.f4Body" },
  ] as const;

  return (
    <section
      aria-labelledby="ai-heading"
      className="relative border-t border-rizq-gold/20 bg-rizq-ink overflow-hidden"
    >
      {/* Deep green glow accent top-start */}
      <div
        aria-hidden
        className="absolute top-0 start-0 w-[600px] h-[400px] opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(26,95,63,0.7) 0%, transparent 65%)",
        }}
      />
      {/* Gold glow accent bottom-end */}
      <div
        aria-hidden
        className="absolute bottom-0 end-0 w-[400px] h-[300px] opacity-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 100% 100%, rgba(200,169,81,0.5) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        {/* Section header */}
        <Reveal>
          <div className="mb-14 sm:mb-18">
            <p className={`eyebrow mb-5 text-rizq-gold-dark ${font}`} style={{ color: "var(--color-rizq-gold)" }}>
              {t("aiFeatures.eyebrow")}
            </p>
            <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10">
              <h2
                id="ai-heading"
                className={`col-span-12 md:col-span-7 display-2 text-rizq-cream ${font}`}
              >
                {t("aiFeatures.heading")}
              </h2>
              <p
                className={`col-span-12 md:col-span-4 md:col-start-9 mt-5 md:mt-0 text-base sm:text-lg text-rizq-cream/60 leading-relaxed self-end ${font}`}
              >
                {t("aiFeatures.sub")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map(({ titleKey, bodyKey }, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <Reveal key={i} delay={i * 0.08}>
                <div className="relative flex flex-col gap-4 p-5 sm:p-6 rounded-2xl border border-rizq-cream/10 bg-rizq-cream/5 hover:bg-rizq-cream/8 hover:border-rizq-gold/25 transition-all duration-200">
                  {/* Icon */}
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rizq-gold/20 bg-rizq-gold/10 text-rizq-gold"
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={1.4} />
                  </span>

                  {/* Title */}
                  <h3
                    className={`text-base sm:text-lg font-semibold text-rizq-cream leading-snug ${font}`}
                  >
                    {t(titleKey)}
                  </h3>

                  {/* Body */}
                  <p
                    className={`text-sm leading-relaxed text-rizq-cream/65 ${font}`}
                  >
                    {t(bodyKey)}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Honesty label band */}
        <Reveal delay={0.36}>
          <div className="mt-12 sm:mt-14 flex items-start gap-4 rounded-xl border border-rizq-gold/20 bg-rizq-gold/5 px-5 sm:px-6 py-4">
            <span
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rizq-gold/30 bg-rizq-gold/15 text-rizq-gold text-xs font-bold"
              aria-hidden
            >
              !
            </span>
            <p
              className={`text-sm text-rizq-cream/75 leading-relaxed ${font}`}
            >
              {t("aiFeatures.honesty")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
