/**
 * /[locale]/proposals/profile — Studio profile editor.
 *
 * Edits the bio / portfolio / brand data + client testimonials that populate
 * the proposal "About you" section. Lives inside the Studio (proposals) area so
 * it sits next to the proposals it feeds. Server component, auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import {
  StudioProfileForm,
  type StudioProfileInitial,
} from "@/components/settings/StudioProfileForm";
import { TestimonialsEditor } from "@/components/settings/TestimonialsEditor";
import { listTestimonials } from "@/app/actions/proposals/testimonials";
import { ArrowLeft } from "lucide-react";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudioProfile" });
  return { title: `${t("pageTitle")} · رِزق` };
}

/** Coerce an unknown jsonb value into the portfolio-sample shape. */
function parsePortfolioSamples(
  raw: unknown
): Array<{ title: string; url?: string; description?: string }> | null {
  if (!Array.isArray(raw)) return null;
  const out: Array<{ title: string; url?: string; description?: string }> = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const o = entry as Record<string, unknown>;
    out.push({
      title: typeof o["title"] === "string" ? o["title"] : "",
      url: typeof o["url"] === "string" ? o["url"] : undefined,
      description: typeof o["description"] === "string" ? o["description"] : undefined,
    });
  }
  return out;
}

export default async function StudioProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "StudioProfile" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Load the current profile row (untyped client — cast defensively).
  const { data: profileRaw } = await supabase
    .from("users")
    .select(
      "full_name_ar, brand_name_ar, tagline_ar, logo_url, bio_ar, bio_en, years_experience, total_projects_completed, notable_clients, portfolio_samples"
    )
    .eq("id", userData.user.id)
    .maybeSingle();

  const p = (profileRaw ?? {}) as Record<string, unknown>;
  const rawYears = p["years_experience"];
  const rawTotal = p["total_projects_completed"];

  const initial: StudioProfileInitial = {
    full_name_ar: (p["full_name_ar"] as string | null) ?? null,
    brand_name_ar: (p["brand_name_ar"] as string | null) ?? null,
    tagline_ar: (p["tagline_ar"] as string | null) ?? null,
    logo_url: (p["logo_url"] as string | null) ?? null,
    bio_ar: (p["bio_ar"] as string | null) ?? null,
    bio_en: (p["bio_en"] as string | null) ?? null,
    years_experience: typeof rawYears === "number" ? rawYears : null,
    total_projects_completed: typeof rawTotal === "number" ? rawTotal : null,
    notable_clients: Array.isArray(p["notable_clients"])
      ? (p["notable_clients"] as unknown[]).filter(
          (v): v is string => typeof v === "string"
        )
      : null,
    portfolio_samples: parsePortfolioSamples(p["portfolio_samples"]),
  };

  // Load testimonials for the editor (owner-scoped). Tolerate failure → [].
  const testimonialsResult = await listTestimonials();
  const testimonials = testimonialsResult.ok ? testimonialsResult.testimonials : [];

  return (
    <AppShell
      locale={locale as "ar" | "en"}
      title={isAr ? "ملف الاستوديو" : "Studio profile"}
      maxWidth="reading"
    >
      <div dir={dir}>
        {/* Back link → Studio (proposals) */}
        <Link
          href="/proposals"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink mb-8 transition-colors ${font}`}
        >
          <ArrowLeft size={14} strokeWidth={1.8} className={isAr ? "rotate-180" : ""} />
          <span>{isAr ? "العودة إلى العروض" : "Back to proposals"}</span>
        </Link>

        {/* Page header */}
        <div className="mb-10">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("pageTitle")}</h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>
            {t("pageSubtitle")}
          </p>
        </div>

        {/* ── Profile / brand ─────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className={`text-base font-semibold text-rizq-ink mb-1 ${font}`}>
            {t("profileSectionTitle")}
          </h2>
          <p className={`text-sm text-rizq-ink-soft mb-5 ${font}`}>
            {t("profileSectionDescription")}
          </p>
          <div className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8">
            <StudioProfileForm locale={locale as "ar" | "en"} initial={initial} />
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────────────────── */}
        <section>
          <h2 className={`text-base font-semibold text-rizq-ink mb-1 ${font}`}>
            {t("testimonials.sectionTitle")}
          </h2>
          <p className={`text-sm text-rizq-ink-soft mb-5 ${font}`}>
            {t("testimonials.sectionDescription")}
          </p>
          <div className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8">
            <TestimonialsEditor locale={locale as "ar" | "en"} initial={testimonials} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
