import { getTranslations } from "next-intl/server";
import { Workflow, Database, Sparkles, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

const VALUE_ICONS = [Workflow, Database, Sparkles, ShieldCheck];

/**
 * "لماذا رِزق؟" — a band of four benefit cards that answer the core value
 * question. Sits high on the page (right after the hero) to give a visitor
 * the narrative before the feature lists. Server component, SSG-safe.
 */
export async function ValueProps({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const values = [
    { titleKey: "valueProps.v1Title", bodyKey: "valueProps.v1Body" },
    { titleKey: "valueProps.v2Title", bodyKey: "valueProps.v2Body" },
    { titleKey: "valueProps.v3Title", bodyKey: "valueProps.v3Body" },
    { titleKey: "valueProps.v4Title", bodyKey: "valueProps.v4Body" },
  ] as const;

  return (
    <section
      aria-labelledby="value-heading"
      className="relative border-t border-rizq-gold/20 bg-rizq-cream/40"
    >
      <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20 lg:py-24">
        {/* Header */}
        <Reveal>
          <div className="mb-10 sm:mb-14 max-w-2xl">
            <p className={`eyebrow mb-4 ${font}`}>{t("valueProps.eyebrow")}</p>
            <h2
              id="value-heading"
              className={`display-2 text-rizq-ink ${font}`}
            >
              {t("valueProps.heading")}
            </h2>
            <p
              className={`mt-4 text-base sm:text-lg text-rizq-ink-soft leading-relaxed ${font}`}
            >
              {t("valueProps.sub")}
            </p>
          </div>
        </Reveal>

        {/* Four benefit cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {values.map(({ titleKey, bodyKey }, i) => {
            const Icon = VALUE_ICONS[i];
            return (
              <Reveal key={titleKey} delay={i * 0.07}>
                <div className="group relative flex h-full flex-col gap-3 rounded-2xl border border-rizq-gold/20 bg-rizq-cream p-5 sm:p-6 transition-all duration-200 hover:border-rizq-green/30 hover:shadow-[0_8px_30px_-12px_rgba(26,95,63,0.2)]">
                  {/* numbered + icon row */}
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rizq-green/15 bg-rizq-green/6 text-rizq-green transition-colors group-hover:border-rizq-green/30 group-hover:bg-rizq-green/10"
                      aria-hidden
                    >
                      <Icon size={20} strokeWidth={1.5} />
                    </span>
                    <span
                      className="section-numeral !text-2xl sm:!text-3xl !opacity-40 tabular"
                      aria-hidden
                    >
                      {new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
                        minimumIntegerDigits: 2,
                      }).format(i + 1)}
                    </span>
                  </div>

                  <h3
                    className={`text-lg sm:text-xl font-semibold text-rizq-ink leading-snug ${font}`}
                  >
                    {t(titleKey)}
                  </h3>
                  <p
                    className={`text-sm sm:text-base leading-relaxed text-rizq-ink-soft ${font}`}
                  >
                    {t(bodyKey)}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
