import { getTranslations } from "next-intl/server";
import { Zap, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function Hero({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Hero" });
  const tLanding = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const chips = [
    tLanding("hero.chip1"),
    tLanding("hero.chip2"),
    tLanding("hero.chip3"),
    tLanding("hero.chip4"),
  ];

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden"
    >
      {/* faint gold dot grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.55] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.22) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 72%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 72%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10">
          {/* Vertical gold hairline rule on the start side */}
          <div
            aria-hidden
            className="col-span-1 hidden lg:flex justify-center"
          >
            <Reveal asMount delay={0.0} duration={1.1}>
              <div className="rule-gold w-px h-full min-h-[24rem]" />
            </Reveal>
          </div>

          <div className="col-span-12 lg:col-span-10 lg:col-start-2 flex flex-col">
            <Reveal asMount delay={0.05} direction="side">
              <p className="eyebrow mb-5 sm:mb-6">{t("eyebrow")}</p>
            </Reveal>

            {/*
              رِزق glyph: rendered without a mount-fade so it paints at full
              opacity on first frame. This keeps it as a clean LCP candidate
              instead of being delayed by the opacity 0→1 transition.
            */}
            <div className="flex flex-col items-start gap-2 mb-6 sm:mb-8">
              <p
                aria-label="Rizq"
                className="font-arabic font-bold text-rizq-green leading-[0.82] tracking-tight"
                style={{
                  fontSize: "clamp(5rem, 14vw, 12rem)",
                  fontFeatureSettings: '"liga", "calt", "kern"',
                }}
              >
                رِزق
              </p>
              {!isAr && (
                <p className="font-sans text-2xl sm:text-3xl text-rizq-gold-dark font-medium tracking-tight ps-1 -mt-1">
                  Rizq
                </p>
              )}
            </div>

            <Reveal asMount delay={0.32} direction="side">
              <h1
                id="hero-heading"
                className={`display-2 max-w-3xl text-rizq-ink ${font}`}
              >
                {t("tagline")}
              </h1>
            </Reveal>

            <Reveal asMount delay={0.42}>
              <p
                className={`mt-5 sm:mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-rizq-ink-soft ${font}`}
              >
                {t("subtitle")}
              </p>
            </Reveal>

            <Reveal asMount delay={0.58}>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                <Link
                  href="/signup"
                  className={`group inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-sm sm:text-base font-medium tracking-wide shadow-[0_2px_0_0_var(--color-rizq-green-dark)] hover:bg-rizq-green-dark transition-all hover:shadow-[0_4px_16px_-4px_rgba(26,95,63,0.45)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 ${font}`}
                >
                  <span>{t("ctaPrimary")}</span>
                  <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                    →
                  </span>
                </Link>

                <a
                  href="#apps"
                  className={`group inline-flex items-center justify-center gap-2 px-2 py-4 text-sm sm:text-base text-rizq-ink-soft hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 rounded-sm ${font}`}
                >
                  <span>{t("ctaSecondary")}</span>
                  <span className="transition-transform group-hover:translate-y-0.5">↓</span>
                </a>
              </div>
            </Reveal>

            {/* Trust chips — concrete proof row under the CTAs */}
            <Reveal asMount delay={0.74}>
              <ul className="mt-8 sm:mt-10 flex flex-wrap items-center gap-x-3 gap-y-2.5">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-green/20 bg-rizq-green/6 px-3 py-1.5 text-xs font-medium text-rizq-green ${font}`}
                  >
                    <Check size={13} strokeWidth={2.2} aria-hidden />
                    <span>{chip}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Live status row */}
            <Reveal asMount delay={0.84} direction="side">
              <div className="mt-7 sm:mt-9 inline-flex items-center gap-3 self-start text-xs">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rizq-green/30 bg-rizq-green/8">
                  <Zap
                    size={13}
                    className="text-rizq-green"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                </span>
                <span
                  className={`tracking-[0.18em] uppercase text-rizq-ink-soft/80 ${font}`}
                >
                  {t("trustBadge")}
                </span>
                <span className="block h-px w-10 bg-rizq-gold/40" aria-hidden />
                <span className={`text-rizq-green font-medium ${font}`}>
                  {t("comingSoon")}
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
