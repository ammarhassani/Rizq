"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FileText, Briefcase, Receipt, CalendarDays, LayoutDashboard } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

const NODES = [
  { key: "node_proposal", icon: FileText },
  { key: "node_gig", icon: Briefcase },
  { key: "node_invoice", icon: Receipt },
  { key: "node_calendar", icon: CalendarDays },
  { key: "node_dashboard", icon: LayoutDashboard },
] as const;

/**
 * "كل شيء متصل" — a horizontal (RTL) flow of 5 product nodes joined by gold
 * hairline connectors that draw in on scroll. Stacks vertically on mobile
 * (connectors become vertical).
 *
 * Accessibility:
 * - The flow is decorative; the localized caption carries the meaning.
 * - The moving connectors are aria-hidden.
 * - The node list gets an aria-label describing the pipeline.
 *
 * Reduced motion (mirrors Reveal's contract): all nodes + connectors render
 * in their final state with no draw-in. We branch on useReducedMotion() and
 * render plain (non-motion) connectors at full extent.
 */
export function IntegrationsFlow({ locale }: Props) {
  const t = useTranslations("Landing");
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const labels = NODES.map((n) => t(`integrations.${n.key}`));
  const flowDescription = labels.join(isAr ? " ← " : " → ");

  return (
    <section
      aria-labelledby="integrations-heading"
      className="relative border-t border-rizq-gold/20 bg-rizq-cream/40"
    >
      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        {/* Section header */}
        <Reveal>
          <div className="mb-14 sm:mb-18 max-w-3xl">
            <p className={`eyebrow mb-5 ${font}`}>{t("integrations.eyebrow")}</p>
            <h2
              id="integrations-heading"
              className={`display-2 text-rizq-ink ${font}`}
            >
              {t("integrations.heading")}
            </h2>
            <p
              className={`mt-5 text-base sm:text-lg text-rizq-ink-soft leading-relaxed ${font}`}
            >
              {t("integrations.caption")}
            </p>
          </div>
        </Reveal>

        {/* Flow: vertical column on mobile, horizontal row on >=md.
            In RTL (ar) flex-row reads right -> left automatically. */}
        <div
          role="group"
          aria-label={flowDescription}
          className="flex flex-col md:flex-row md:items-stretch gap-0"
        >
          {NODES.map((node, i) => {
            const Icon = node.icon;
            const label = labels[i];
            const isLast = i === NODES.length - 1;

            return (
              <Fragment key={node.key}>
                {/* Node card */}
                <Reveal delay={i * 0.12} className="md:flex-1">
                  <div className="flex md:flex-col items-center gap-4 md:gap-3 md:text-center">
                    <span
                      className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rizq-green/20 bg-white text-rizq-green shadow-[0_4px_16px_-6px_rgba(26,95,63,0.25)]"
                      aria-hidden
                    >
                      <Icon size={24} strokeWidth={1.5} />
                    </span>
                    <span
                      className={`text-base font-semibold text-rizq-ink ${font}`}
                    >
                      {label}
                    </span>
                  </div>
                </Reveal>

                {/* Connector — decorative, drawn in on scroll. Hidden after the
                    last node. Horizontal on >=md, vertical on mobile. */}
                {!isLast && (
                  <Connector
                    delay={i * 0.12 + 0.18}
                    reduce={!!reduce}
                    isAr={isAr}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
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
  // Wrapper reserves the connector's footprint in the layout:
  //  - mobile: a short vertical lane next to the icon column (offset to sit
  //    under the icon, not centered under the wider card).
  //  - >=md: a flexible horizontal lane between two cards.
  const wrapperClass =
    "shrink-0 self-stretch flex items-center " +
    // mobile vertical lane
    "h-8 w-14 justify-center md:h-auto md:w-auto " +
    // desktop: take remaining horizontal space, vertically center on the icon row
    "md:flex-[0.6] md:items-start md:pt-7";

  // Mobile: vertical hairline grows top->bottom.
  // Desktop: horizontal hairline grows from the flow's start edge
  // (right in RTL, left in LTR).
  const mobileBar = "rule-gold-h md:hidden w-px h-full";
  const desktopBar = "rule-gold-h hidden md:block h-px w-full";

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
      {/* mobile vertical */}
      <motion.div
        className={mobileBar}
        style={{ transformOrigin: "top" }}
        initial={{ scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* desktop horizontal */}
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
