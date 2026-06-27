/**
 * /[locale]/projects — Projects home. The clean place to see and RESUME any
 * engagement (the umbrella entity). Lists active projects with money + the
 * derived lifecycle stage. Server component, auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { StartProjectButton } from "@/components/wizard/StartProjectButton";
import { listProjects } from "@/app/actions/projects/listProjects";
import type { LifecycleStageKey } from "@/lib/projects/lifecycle";

type Params = { locale: string };

const STAGE_TITLE_KEY: Record<LifecycleStageKey, string> = {
  proposal: "stageProposalTitle",
  project: "stageProjectTitle",
  invoice: "stageInvoiceTitle",
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Projects" });
  return { title: `${t("indexTitle")} · رِزق` };
}

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

export default async function ProjectsIndexPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(getPathname({ href: "/login", locale: locale as "ar" | "en" }));

  const t = await getTranslations({ locale, namespace: "Projects" });
  const tW = await getTranslations({ locale, namespace: "Wizard" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const result = await listProjects();
  const items = result.ok ? result.items : [];

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "المشاريع" : "Projects"} maxWidth="wide">
      <div dir={dir}>
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t("indexEyebrow")}</p>
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("indexTitle")}</h1>
            <p className={`mt-2 text-base text-rizq-ink-soft max-w-xl ${font}`}>{t("indexSubtitle")}</p>
          </div>
          <div className="shrink-0">
            <StartProjectButton locale={locale as "ar" | "en"} />
          </div>
        </div>

        {items.length === 0 ? (
          <div className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/70 p-10 text-center ${font}`}>
            <p className={`text-lg font-semibold text-rizq-ink ${font}`}>{t("indexEmptyTitle")}</p>
            <p className={`mt-1.5 text-sm text-rizq-ink-soft ${font}`}>{t("indexEmptySubtitle")}</p>
            <div className="mt-5 flex justify-center">
              <StartProjectButton locale={locale as "ar" | "en"} />
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {items.map((p) => {
              const lc = p.lifecycle;
              const stageLabel = lc.complete
                ? t("lifecycleComplete")
                : lc.currentStageKey
                  ? tW(STAGE_TITLE_KEY[lc.currentStageKey])
                  : "";
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}${lc.complete ? "" : "?guided=1"}` as `/projects/${string}`}
                    className={`group block rounded-2xl border border-rizq-gold/20 bg-white/70 hover:bg-rizq-cream/90 hover:border-rizq-green/30 hover:shadow-sm hover:-translate-y-0.5 transition motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 p-5 ${font}`}
                  >
                    <div dir={dir} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-rizq-ink leading-snug truncate group-hover:text-rizq-green transition-colors">
                          {p.title}
                        </p>
                        {p.clientName && (
                          <p className={`mt-0.5 text-sm text-rizq-ink-soft truncate ${font}`}>{p.clientName}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="tabular font-sans text-base font-bold text-rizq-green leading-none">
                          {fmtPrice(p.amountSar, locale as "ar" | "en")}
                        </p>
                        <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "ريال" : "SAR"}</p>
                      </div>
                    </div>

                    {/* Lifecycle stage + resume affordance */}
                    <div dir={dir} className="mt-4 pt-3 border-t border-rizq-gold/15 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            lc.complete ? "bg-emerald-500" : "bg-amber-500 animate-breathe-amber"
                          }`}
                          aria-hidden
                        />
                        <span className={`${lc.complete ? "text-emerald-700" : "text-amber-700"} font-medium ${font}`}>
                          {stageLabel}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rizq-green opacity-0 group-hover:opacity-100 transition-opacity">
                        {lc.complete ? t("openProject") : t("resume")}
                        <span className="ltr:rotate-0 rtl:rotate-180">→</span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
