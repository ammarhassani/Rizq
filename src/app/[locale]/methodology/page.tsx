import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/nav/SiteNav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Methodology" });
  return { title: `${t("title")} — رِزق` };
}

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Methodology" });
  const tLegal = await getTranslations({ locale, namespace: "Legal" });
  const tFooter = await getTranslations({ locale, namespace: "Footer" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const sections = [
    { title: t("s1Title"), body: t("s1Body") },
    { title: t("s2Title"), body: t("s2Body") },
    { title: t("s3Title"), body: t("s3Body") },
    { title: t("s4Title"), body: t("s4Body") },
    { title: t("s5Title"), body: t("s5Body") },
    { title: t("s6Title"), body: t("s6Body") },
    { title: t("s7Title"), body: t("s7Body") },
    { title: t("s8Title"), body: t("s8Body") },
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.16) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />

      <SiteNav locale={locale as "ar" | "en"} />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 py-12 sm:py-16 lg:py-20">
        <p className="eyebrow mb-4">{t("eyebrow")}</p>
        <h1 className={`display-2 text-rizq-ink mb-6 ${font}`}>{t("title")}</h1>
        <p
          className={`text-base sm:text-lg leading-relaxed text-rizq-ink-soft mb-12 ${font}`}
        >
          {t("intro")}
        </p>

        <div className="space-y-10 sm:space-y-12 border-t border-rizq-gold/15 pt-10">
          {sections.map((s, i) => (
            <section key={i}>
              <h2
                className={`text-xl sm:text-2xl font-semibold text-rizq-ink mb-3 ${font}`}
              >
                {s.title}
              </h2>
              <p
                className={`text-base leading-relaxed text-rizq-ink-soft ${font}`}
              >
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-rizq-gold/15">
          <p className={`text-sm text-rizq-ink-soft ${font}`}>
            {t("contact", { email: tFooter("contactEmail") })}
          </p>
          <p
            className={`mt-3 text-[11px] tracking-[0.18em] uppercase text-rizq-ink-soft/60 ${font}`}
          >
            {tLegal("lastUpdated")} · v0.1
          </p>
          <Link
            href="/"
            className={`mt-6 inline-flex items-center gap-1 text-sm text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
          >
            <span className="inline-block rtl:rotate-180">←</span>
            <span>{tLegal("backHome")}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
