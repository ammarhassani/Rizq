import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/nav/SiteNav";
import { createClient } from "@/lib/supabase/server";
import {
  Layers,
  Sparkles,
  FileText,
  Landmark,
  BarChart3,
  Clock,
  ShieldCheck,
  User,
  Ban,
  HelpCircle,
} from "lucide-react";
import { MethodologyFaq } from "@/components/methodology/MethodologyFaq";

// ─── Types ───────────────────────────────────────────────────────────────────

type MethodologySection = {
  id: string;
  sort_order: number;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  icon: string | null;
  deep_link: string | null;
  last_updated: string | null;
};

// ─── Icon map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  layers: Layers,
  sparkles: Sparkles,
  "file-text": FileText,
  landmark: Landmark,
  "bar-chart-3": BarChart3,
  clock: Clock,
  "shield-check": ShieldCheck,
  user: User,
  ban: Ban,
};

function SectionIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : HelpCircle;
  return <Icon size={20} strokeWidth={1.7} className={className} />;
}

// ─── Content renderer ────────────────────────────────────────────────────────
// Splits on double-newline for paragraphs; handles single \n as <br /> within a paragraph.

function SectionContent({ text, font }: { text: string; font: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className={`space-y-3 ${font}`}>
      {paragraphs.map((para, i) => (
        <p key={i} className="text-base leading-relaxed text-rizq-ink-soft">
          {para.split(/\n/).map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Methodology" });
  return {
    title: `${t("title")} — رِزق`,
    description:
      locale === "ar"
        ? "كيف يحسب رِزق أسعار العمل الحر في السعودية — منهجية شفافة مبنية على بيانات حقيقية."
        : "How Rizq calculates Saudi freelance prices — a transparent methodology built on real data.",
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
  const isAr = locale === "ar";

  // Fetch sections from Supabase (anon read; RLS policy enabled=true)
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("methodology_sections")
    .select(
      "id, sort_order, title_ar, title_en, content_ar, content_en, icon, deep_link, last_updated"
    )
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  const sections: MethodologySection[] = (rows ?? []) as MethodologySection[];

  // Build sections text for the FAQ island (title + content concatenated)
  const sectionsTextForFaq = sections
    .map((s) => {
      const title = isAr ? s.title_ar : s.title_en;
      const body = isAr ? s.content_ar : s.content_en;
      return `### ${title}\n${body}`;
    })
    .join("\n\n");

  // Format last_updated date per section
  const fmtDate = (iso: string | null): string => {
    if (!iso) return "";
    try {
      return new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-paper" dir={isAr ? "rtl" : "ltr"}>
      {/* Dot-grid background */}
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
        {/* Header */}
        <p className="eyebrow mb-4">{t("eyebrow")}</p>
        <h1 className={`display-2 text-rizq-ink mb-6 ${font}`}>{t("title")}</h1>
        <p className={`text-base sm:text-lg leading-relaxed text-rizq-ink-soft mb-10 ${font}`}>
          {t("intro")}
        </p>

        {/* Table of contents / Jump links */}
        {sections.length > 0 && (
          <nav
            aria-label={t("tocLabel")}
            className="mb-12 rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 p-5 sm:p-6"
          >
            <p className={`text-xs tracking-[0.18em] uppercase text-rizq-ink-soft/70 mb-3 ${font}`}>
              {t("tocLabel")}
            </p>
            <ol className={`space-y-2 ${font}`}>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="inline-flex items-center gap-2 text-sm text-rizq-ink hover:text-rizq-green transition-colors"
                  >
                    <SectionIcon
                      name={s.icon}
                      className="shrink-0 text-rizq-green/70"
                    />
                    <span>{isAr ? s.title_ar : s.title_en}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Sections */}
        <div className="space-y-10 sm:space-y-12 border-t border-rizq-gold/15 pt-10">
          {sections.map((s) => {
            const title = isAr ? s.title_ar : s.title_en;
            const content = isAr ? s.content_ar : s.content_en;
            const updated = fmtDate(s.last_updated);

            return (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-20"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rizq-green/10 text-rizq-green">
                    <SectionIcon name={s.icon} />
                  </span>
                  <h2 className={`text-xl sm:text-2xl font-semibold text-rizq-ink leading-tight ${font}`}>
                    {title}
                  </h2>
                </div>

                <SectionContent text={content} font={font} />

                {updated && (
                  <p className={`mt-3 text-[11px] tracking-[0.14em] uppercase text-rizq-ink-soft/50 ${font}`}>
                    {t("lastUpdated")}: {updated}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {/* AI FAQ Island */}
        <div className="mt-16 border-t border-rizq-gold/15 pt-10">
          <MethodologyFaq locale={locale as "ar" | "en"} sectionsText={sectionsTextForFaq} />
        </div>

        {/* Footer */}
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
