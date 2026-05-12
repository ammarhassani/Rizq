import { getTranslations } from "next-intl/server";
import { WaitlistForm } from "./WaitlistForm";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

export async function Waitlist({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Waitlist" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-heading"
      className="relative border-t border-rizq-gold/20"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-20 sm:py-28 lg:py-32">
        <div className="grid grid-cols-12 gap-x-6 lg:gap-x-12 items-center">
          <Reveal className="col-span-12 lg:col-span-7">
            <h2
              id="waitlist-heading"
              className={`display-2 text-rizq-ink mb-5 max-w-xl ${font}`}
            >
              {t("heading")}
            </h2>
            <p className={`text-lg sm:text-xl text-rizq-ink-soft leading-relaxed max-w-xl mb-10 ${font}`}>
              {t("subheading")}
            </p>
            <WaitlistForm locale={locale} />
          </Reveal>

          {/* Decorative right block — large faded رِزق glyph */}
          <div className="hidden lg:flex col-span-5 col-start-8 items-center justify-end">
            <p
              aria-hidden
              className="font-arabic font-bold text-rizq-green/[0.08] leading-none select-none"
              style={{ fontSize: "clamp(8rem, 14vw, 16rem)" }}
            >
              رِزق
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
