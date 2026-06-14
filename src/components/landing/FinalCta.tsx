import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function FinalCta({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative overflow-hidden border-t border-rizq-gold/20 bg-rizq-green"
    >
      {/* Decorative faded رِزق glyph */}
      <p
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center justify-center font-arabic font-bold text-rizq-cream leading-none"
        style={{
          fontSize: "clamp(12rem, 36vw, 34rem)",
          opacity: 0.05,
          letterSpacing: "-0.02em",
        }}
      >
        رِزق
      </p>

      {/* Gold dot grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.4) 1px, transparent 1.6px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-24 sm:py-32 lg:py-40 flex flex-col items-center text-center">
        <Reveal asMount>
          <h2
            id="final-cta-heading"
            className={`display-1 text-rizq-cream max-w-3xl ${font}`}
          >
            {t("finalCta.heading")}
          </h2>
        </Reveal>

        <Reveal asMount delay={0.14}>
          <p
            className={`mt-6 sm:mt-8 max-w-xl text-lg sm:text-xl leading-relaxed text-rizq-cream/75 ${font}`}
          >
            {t("finalCta.sub")}
          </p>
        </Reveal>

        <Reveal asMount delay={0.26}>
          <Link
            href="/signup"
            className={`mt-10 sm:mt-12 group inline-flex items-center justify-center gap-2 rounded-full bg-rizq-cream text-rizq-green px-8 py-4 text-base sm:text-lg font-semibold tracking-wide shadow-[0_2px_0_0_rgba(0,0,0,0.12)] hover:bg-white transition-all hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-green min-h-[52px] ${font}`}
          >
            <span>{t("finalCta.cta")}</span>
            <span
              className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </Link>
        </Reveal>

        {/* Gold decorative rule below */}
        <Reveal asMount delay={0.4}>
          <div className="mt-16 rule-gold-h h-px w-24 mx-auto opacity-40" aria-hidden />
        </Reveal>
      </div>
    </section>
  );
}
