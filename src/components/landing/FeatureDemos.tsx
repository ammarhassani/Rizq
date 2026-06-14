"use client";

import { useTranslations } from "next-intl";
import { Reveal } from "@/components/motion/Reveal";
import { DemoCard } from "./DemoCard";
import { DemoRate } from "./DemoRate";
import { DemoInvoice } from "./DemoInvoice";
import { DemoTone } from "./DemoTone";

type Props = { locale: "ar" | "en" };

/**
 * Orchestrates three genuinely-interactive, client-only mini demos in a
 * responsive grid of DemoCards. No backend, no auth — representative data.
 * Each demo carries a text caption (its accessible content).
 */
export function FeatureDemos({ locale }: Props) {
  const t = useTranslations("Landing");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const demos = [
    {
      key: "rate",
      titleKey: "demos.rateTitle",
      captionKey: "demos.rateCaption",
      node: <DemoRate locale={locale} />,
    },
    {
      key: "invoice",
      titleKey: "demos.invoiceTitle",
      captionKey: "demos.invoiceCaption",
      node: <DemoInvoice locale={locale} />,
    },
    {
      key: "tone",
      titleKey: "demos.toneTitle",
      captionKey: "demos.toneCaption",
      node: <DemoTone locale={locale} />,
    },
  ] as const;

  return (
    <section
      aria-labelledby="demos-heading"
      className="relative border-t border-rizq-gold/20 bg-paper"
    >
      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        {/* Section header */}
        <Reveal>
          <div className="mb-14 sm:mb-18">
            <p className={`eyebrow mb-5 ${font}`}>{t("demos.eyebrow")}</p>
            <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10">
              <h2
                id="demos-heading"
                className={`col-span-12 md:col-span-7 display-2 text-rizq-ink ${font}`}
              >
                {t("demos.heading")}
              </h2>
              <p
                className={`col-span-12 md:col-span-5 md:col-start-8 mt-5 md:mt-0 text-lg text-rizq-ink-soft leading-relaxed self-end ${font}`}
              >
                {t("demos.sub")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Demo grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {demos.map((demo, i) => (
            <Reveal key={demo.key} delay={i * 0.1}>
              <DemoCard
                title={t(demo.titleKey)}
                caption={t(demo.captionKey)}
                isAr={isAr}
              >
                {demo.node}
              </DemoCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
