import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";

type Params = { locale: string; id: string };

type QueryRow = {
  id: string;
  result_min: number | null;
  result_median: number | null;
  result_max: number | null;
  result_sample_size: number | null;
  result_fallback_used: boolean;
  created_at: string;
  specialty: { name_ar: string; name_en: string; slug: string } | null;
  city: { name_ar: string; name_en: string; slug: string } | null;
  experience_tier: { name_ar: string; name_en: string; slug: string } | null;
};

async function fetchSharedQuery(id: string): Promise<QueryRow | null> {
  // UUID guard — avoid hitting the DB on garbage paths
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("queries")
    .select(`
      id, result_min, result_median, result_max,
      result_sample_size, result_fallback_used, created_at,
      specialty:specialties (slug, name_ar, name_en),
      city:cities (slug, name_ar, name_en),
      experience_tier:experience_tiers (slug, name_ar, name_en)
    `)
    .eq("id", id)
    .eq("public_share", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as QueryRow;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  const row = await fetchSharedQuery(id);
  if (!row || !row.result_median) {
    return { title: "Rizq" };
  }
  const tShare = await getTranslations({ locale, namespace: "Share" });
  const sName = row.specialty ? row.specialty[locale === "ar" ? "name_ar" : "name_en"] : "";
  const cName = row.city ? row.city[locale === "ar" ? "name_ar" : "name_en"] : "";
  const median = Math.round(row.result_median);
  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");

  const description =
    locale === "ar"
      ? `وسيط السعر: ${fmt.format(median)} ريال · ${sName} · ${cName}`
      : `Median: ${fmt.format(median)} SAR · ${sName} · ${cName}`;

  return {
    title: `${tShare("title")} · رِزق`,
    description,
    openGraph: {
      title: `${tShare("title")} · ${sName}`,
      description,
      type: "website",
    },
  };
}

export default async function SharedResultPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const row = await fetchSharedQuery(id);
  if (!row || row.result_median === null) notFound();

  const t = await getTranslations({ locale, namespace: "Tool.result" });
  const tShare = await getTranslations({ locale, namespace: "Share" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });

  const min = Math.round(row.result_min ?? 0);
  const median = Math.round(row.result_median);
  const max = Math.round(row.result_max ?? 0);
  const range = max - min;
  const medianPct = range > 0 ? ((median - min) / range) * 100 : 50;

  const specialty = row.specialty
    ? row.specialty[locale === "ar" ? "name_ar" : "name_en"]
    : "—";
  const city = row.city
    ? row.city[locale === "ar" ? "name_ar" : "name_en"]
    : "—";
  const tier = row.experience_tier
    ? row.experience_tier[locale === "ar" ? "name_ar" : "name_en"]
    : "—";

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.20) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      />

      <SiteNav locale={locale} />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 py-12 sm:py-16">
        <p className="eyebrow mb-3">{tShare("byline")}</p>
        <h1 className={`display-2 text-rizq-ink mb-4 ${font}`}>
          {specialty}
        </h1>
        <p className={`text-base text-rizq-ink-soft mb-10 ${font}`}>
          {city} · {tier}
        </p>

        <article className="card-wahaj p-7 sm:p-10 shadow-[0_30px_60px_-30px_rgba(26,95,63,0.18)] animate-fade-in">
          <p className="eyebrow mb-6">{t("eyebrow")}</p>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
            {[
              { label: t("min"), value: min, big: false },
              { label: t("median"), value: median, big: true },
              { label: t("max"), value: max, big: false },
            ].map((col) => (
              <div key={col.label} className="flex flex-col items-center text-center">
                <span
                  className={`text-xs sm:text-sm tracking-[0.18em] uppercase mb-1 ${
                    col.big ? "text-rizq-gold-dark" : "text-rizq-ink-soft/60"
                  } ${font}`}
                >
                  {col.label}
                </span>
                <span
                  className={`tabular font-sans leading-none ${
                    col.big
                      ? "text-5xl sm:text-7xl text-rizq-green font-semibold"
                      : "text-2xl sm:text-3xl text-rizq-ink/70 font-medium"
                  }`}
                >
                  {fmt.format(col.value)}
                </span>
                <span
                  className={`mt-1 text-[10px] sm:text-xs tracking-wider uppercase ${
                    col.big ? "text-rizq-ink-soft/70" : "text-rizq-ink-soft/50"
                  } ${font}`}
                >
                  {t("currency")}
                </span>
              </div>
            ))}
          </div>

          <div className="mb-8 relative h-2 rounded-full bg-rizq-gold/15 overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-rizq-gold/30 via-rizq-green/40 to-rizq-gold/30 rounded-full"
            />
            <span
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-rizq-green rounded-full shadow-[0_0_0_3px_rgba(250,245,236,0.9)]"
              style={{ left: `${medianPct}%`, transform: "translate(-50%, -50%)" }}
            />
          </div>

          <p className={`text-sm text-rizq-ink ${font}`}>
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-rizq-green me-2 align-middle"
            />
            {t("sampleSize", { n: fmt.format(row.result_sample_size ?? 0) })}
          </p>
        </article>

        <div className="mt-12 text-center">
          <Link
            href="/tool"
            className={`group inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
          >
            <span>{tShare("viewMore")}</span>
            <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
