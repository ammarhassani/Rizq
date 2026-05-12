import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function Faq({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Faq" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
    { q: t("q7"), a: t("a7") },
  ];

  const numberFormat = new Intl.NumberFormat(
    isAr ? "ar-SA" : "en-US",
    { minimumIntegerDigits: 2 }
  );

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="relative border-t border-rizq-gold/20"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        <Reveal>
          <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10 mb-12 sm:mb-16">
            <div className="col-span-12 lg:col-span-5">
              <p className="eyebrow mb-6">{t("eyebrow")}</p>
              <h2
                id="faq-heading"
                className={`display-2 text-rizq-ink ${font}`}
              >
                {t("heading")}
              </h2>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <ul className="divide-y divide-rizq-gold/15 border-y border-rizq-gold/15">
          {items.map((item, idx) => (
            <li key={idx}>
              <details className="group py-6 sm:py-7">
                <summary className="flex items-start gap-6 sm:gap-10 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className={`text-xs sm:text-sm tabular text-rizq-gold-dark/60 mt-2 ${font}`}>
                    {numberFormat.format(idx + 1)}
                  </span>
                  <h3 className={`flex-1 text-lg sm:text-xl text-rizq-ink font-medium leading-snug pe-4 ${font}`}>
                    {item.q}
                  </h3>
                  <span
                    aria-hidden
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-gold-dark transition-all duration-300 group-open:rotate-45 group-open:border-rizq-green/30 group-open:text-rizq-green"
                  >
                    <Plus size={16} strokeWidth={1.6} />
                  </span>
                </summary>
                <div className="ps-12 sm:ps-16 pe-12 sm:pe-16 mt-4">
                  <p className={`text-base sm:text-lg text-rizq-ink-soft leading-relaxed ${font}`}>
                    {item.a}
                  </p>
                </div>
              </details>
            </li>
          ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
