import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { APPS } from "@/lib/apps";

type Props = { locale: "ar" | "en" };

export async function AppsGrid({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Landing" });
  const tApps = await getTranslations({ locale, namespace: "AppShell" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section
      id="apps"
      aria-labelledby="apps-heading"
      className="relative border-t border-rizq-gold/20 bg-rizq-cream/40"
    >
      {/* subtle dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(26,95,63,0.12) 1px, transparent 1.6px)",
          backgroundSize: "28px 28px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-12 py-16 sm:py-20 lg:py-24">
        {/* Section intro */}
        <Reveal>
          <div className="mb-10 sm:mb-14">
            <p className={`eyebrow mb-4 ${font}`}>{t("apps.eyebrow")}</p>
            <div className="grid grid-cols-12 gap-x-6 lg:gap-x-10">
              <h2
                id="apps-heading"
                className={`col-span-12 md:col-span-7 display-2 text-rizq-ink ${font}`}
              >
                {t("apps.heading")}
              </h2>
              <p
                className={`col-span-12 md:col-span-5 md:col-start-8 mt-5 md:mt-0 text-lg text-rizq-ink-soft leading-relaxed self-end ${font}`}
              >
                {t("apps.sub")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Flat apps grid — all 13 modules */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {APPS.map((app, i) => {
            const Icon = app.icon;
            const name = tApps(`apps.${app.id}.name`);
            const tagline = tApps(`apps.${app.id}.tagline`);

            return (
              <Reveal key={app.id} delay={i * 0.04}>
                <Link
                  href={app.href}
                  className={`group relative flex flex-col items-start gap-3 p-4 sm:p-5 rounded-2xl border border-rizq-gold/20 bg-rizq-cream hover:border-rizq-green/30 hover:bg-white hover:shadow-[0_4px_20px_-4px_rgba(26,95,63,0.18)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green focus-visible:ring-offset-2 min-h-[44px] ${font}`}
                  aria-label={`${name} — ${tagline}`}
                >
                  {/* Icon tile */}
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rizq-green/15 bg-rizq-green/6 text-rizq-green transition-colors group-hover:border-rizq-green/30 group-hover:bg-rizq-green/10"
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={1.5} />
                  </span>

                  {/* Name */}
                  <h3
                    className={`text-sm sm:text-base font-semibold text-rizq-ink leading-snug ${font}`}
                  >
                    {name}
                  </h3>

                  {/* Tagline */}
                  <p
                    className={`text-xs text-rizq-ink-soft leading-relaxed line-clamp-2 ${font}`}
                  >
                    {tagline}
                  </p>

                  {/* Subtle arrow indicator */}
                  <span
                    aria-hidden
                    className="absolute top-4 end-4 text-rizq-gold/40 text-xs transition-opacity opacity-0 group-hover:opacity-100 rtl:rotate-180"
                  >
                    →
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
