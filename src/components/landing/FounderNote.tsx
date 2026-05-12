import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function FounderNote({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Founder" });
  const tHero = await getTranslations({ locale, namespace: "Hero" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  // Founder initials based on the displayed name
  const initials = isAr ? "ع.ا" : "AA";

  return (
    <section
      id="founder"
      aria-labelledby="founder-heading"
      className="relative border-t border-rizq-gold/20 bg-rizq-cream-dark/30"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        <Reveal>
        <div className="grid grid-cols-12 gap-x-6 lg:gap-x-12">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow mb-6">{t("eyebrow")}</p>
            <h2
              id="founder-heading"
              className={`display-2 text-rizq-ink mb-8 max-w-xl ${font}`}
            >
              {t("heading")}
            </h2>
            <p className={`text-lg sm:text-xl leading-relaxed text-rizq-ink-soft max-w-2xl ${font}`}>
              {t("body")}
            </p>
          </div>

          <div className="col-span-12 lg:col-span-4 lg:col-start-9 mt-12 lg:mt-0 flex flex-col items-start justify-end">
            <div className="flex items-center gap-5">
              <div
                aria-hidden
                className="relative h-16 w-16 rounded-full border border-rizq-gold/40 bg-rizq-cream flex items-center justify-center"
              >
                <span className={`text-xl text-rizq-green font-semibold ${font}`}>
                  {initials}
                </span>
                <span className="absolute -bottom-1 -end-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rizq-green text-[10px] text-rizq-cream font-medium">
                  ✓
                </span>
              </div>
              <div className="flex flex-col">
                <span className={`text-base text-rizq-ink font-semibold ${font}`}>
                  {t("name")}
                </span>
                <span className={`text-sm text-rizq-ink-soft ${font}`}>
                  {t("role")}
                </span>
              </div>
            </div>

            <div className="mt-12 inline-flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rizq-green/10 ring-1 ring-rizq-green/20"
              >
                <span className="block h-2 w-2 rounded-full bg-rizq-green" />
              </span>
              <span className={`text-xs tracking-[0.18em] uppercase text-rizq-ink-soft ${font}`}>
                {tHero("trustBadge")}
              </span>
            </div>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}
