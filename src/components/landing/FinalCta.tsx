import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

/** Final CTA — board: an aurora rotating-border card on a panel surface. */
export async function FinalCta({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section aria-labelledby="final-cta-heading" className="relative border-t border-[var(--line-2)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
        <Reveal asMount>
          <div className="aurora-ring">
            <div className="relative overflow-hidden rounded-[20px] bg-[var(--panel)] px-8 py-14 text-center sm:py-16">
              {/* aurora orb */}
              <div
                aria-hidden
                className="orb-drift-b pointer-events-none absolute -top-40 h-96 w-96 rounded-full"
                style={{
                  insetInlineStart: "35%",
                  filter: "blur(120px)",
                  opacity: 0.2,
                  background: "radial-gradient(circle, var(--acc), transparent 70%)",
                }}
              />
              <div className="relative">
                <h2
                  id="final-cta-heading"
                  className={`font-display text-[clamp(2rem,5vw,2.4rem)] font-bold text-rizq-ink ${font}`}
                >
                  {t("finalCta.heading")}
                </h2>
                <p className={`mx-auto mt-2 max-w-md text-sm text-[var(--content-muted)] ${font}`}>
                  {t("finalCta.sub")}
                </p>
                <Link
                  href="/signup"
                  className={`aurora-btn group mt-6 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold tracking-wide transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] ${font}`}
                >
                  <span>{t("finalCta.cta")}</span>
                  <span
                    className="inline-block transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
