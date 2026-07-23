"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Tag, FileText, Briefcase, Receipt, HandCoins } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

const STEPS = [
  { key: 1, icon: Tag, titleKey: "workflow.step1Title", bodyKey: "workflow.step1Body" },
  { key: 2, icon: FileText, titleKey: "workflow.step2Title", bodyKey: "workflow.step2Body" },
  { key: 3, icon: Briefcase, titleKey: "workflow.step3Title", bodyKey: "workflow.step3Body" },
  { key: 4, icon: Receipt, titleKey: "workflow.step4Title", bodyKey: "workflow.step4Body" },
  { key: 5, icon: HandCoins, titleKey: "workflow.step5Title", bodyKey: "workflow.step5Body" },
] as const;

/**
 * "من العرض إلى القبض" — a five-step narrative (price → propose → run →
 * invoice → get paid). Each step is a captioned card; gold hairline
 * connectors draw in on scroll (RTL-aware) to express "everything flows".
 *
 * Accessibility:
 * - The localized caption + the ordered list carry the meaning.
 * - Connectors are decorative and aria-hidden.
 * - Reduced motion: connectors render at full extent, no draw-in (Reveal
 *   already degrades to a plain div under reduced motion).
 */
export function WorkflowStory({ locale }: Props) {
  const t = useTranslations("Landing");
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const stepLabels = STEPS.map((s) => t(s.titleKey));
  const flowDescription = stepLabels.join(isAr ? " ← " : " → ");
  const nf = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
    minimumIntegerDigits: 2,
  });

  return (
    <section
      aria-labelledby="workflow-heading"
      className="relative border-t border-rizq-gold/20 bg-paper"
    >
      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20 lg:py-24">
        {/* Header */}
        <Reveal>
          <div className="mb-12 sm:mb-16 max-w-2xl">
            <p className={`eyebrow mb-4 ${font}`}>{t("workflow.eyebrow")}</p>
            <h2
              id="workflow-heading"
              className={`display-2 text-rizq-ink ${font}`}
            >
              {t("workflow.heading")}
            </h2>
            <p
              className={`mt-4 text-base sm:text-lg text-rizq-ink-soft leading-relaxed ${font}`}
            >
              {t("workflow.sub")}
            </p>
          </div>
        </Reveal>

        {/* Steps: vertical on mobile, horizontal row on >=lg.
            ol carries the ordered semantics. */}
        <ol
          aria-label={flowDescription}
          className="flex flex-col lg:flex-row lg:items-stretch gap-0"
        >
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <Fragment key={step.key}>
                <Reveal delay={i * 0.1} className="lg:flex-1">
                  <li className="group flex lg:flex-col items-start gap-4 lg:gap-0 lg:h-full">
                    <div className="flex flex-col items-center lg:items-start lg:w-full">
                      <span
                        className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rizq-green/20 bg-rizq-cream text-rizq-green shadow-[0_4px_16px_-6px_rgba(26,95,63,0.25)] transition-colors group-hover:border-rizq-green/40"
                        aria-hidden
                      >
                        <Icon size={24} strokeWidth={1.5} />
                        <span className="absolute -top-2 -end-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rizq-green px-1.5 text-[11px] font-bold text-rizq-cream tabular">
                          {nf.format(step.key)}
                        </span>
                      </span>
                    </div>
                    <div className="lg:mt-5 lg:pe-6">
                      <h3
                        className={`text-base sm:text-lg font-semibold text-rizq-ink leading-snug ${font}`}
                      >
                        {t(step.titleKey)}
                      </h3>
                      <p
                        className={`mt-1.5 text-sm leading-relaxed text-rizq-ink-soft ${font}`}
                      >
                        {t(step.bodyKey)}
                      </p>
                    </div>
                  </li>
                </Reveal>

                {!isLast && (
                  <Connector delay={i * 0.1 + 0.16} reduce={!!reduce} isAr={isAr} />
                )}
              </Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Connector({
  delay,
  reduce,
  isAr,
}: {
  delay: number;
  reduce: boolean;
  isAr: boolean;
}) {
  // mobile: short vertical lane offset under the icon column.
  // >=lg: a thin horizontal lane between cards, aligned to the icon row.
  const wrapperClass =
    "shrink-0 flex items-center " +
    "h-6 w-14 justify-center lg:h-auto lg:w-auto " +
    "lg:flex-[0.35] lg:items-start lg:pt-7";

  const mobileBar = "rule-gold-h lg:hidden w-px h-full";
  const desktopBar = "rule-gold-h hidden lg:block h-px w-full";

  if (reduce) {
    return (
      <div className={wrapperClass} aria-hidden>
        <div className={mobileBar} />
        <div className={desktopBar} />
      </div>
    );
  }

  return (
    <div className={wrapperClass} aria-hidden>
      <motion.div
        className={mobileBar}
        style={{ transformOrigin: "top" }}
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className={desktopBar}
        style={{ transformOrigin: isAr ? "right" : "left" }}
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
