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
      className="relative border-t border-[var(--line-2)] bg-[var(--surface)]/50"
    >
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
                  className={`nm-raised group relative flex flex-col items-start gap-3 rounded-2xl bg-[var(--raised)] p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] sm:p-5 ${font}`}
                  aria-label={`${name}: ${tagline}`}
                >
                  {/* Icon tile — inset neumorph */}
                  <span
                    className="nm-inset inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--raised)] text-[var(--acc)]"
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={1.6} />
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
