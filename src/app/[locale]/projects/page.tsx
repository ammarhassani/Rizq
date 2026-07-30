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
import { WidgetError } from "@/components/dashboard/WidgetError";
import type { LifecycleStageKey } from "@/lib/projects/lifecycle";
import { fmtMoney } from "@/lib/format/number";

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
  return fmtMoney(n, locale);
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

  // A failed list must not read as "no projects yet" (Principle V). try/catch too,
  // so a THROWN failure gets the same inline retry instead of a 500 page.
  type ProjectItem = Extract<Awaited<ReturnType<typeof listProjects>>, { ok: true }>["items"][number];
  let items: ProjectItem[] = [];
  let loadError = false;
  try {
    const result = await listProjects();
    items = result.ok ? result.items : [];
    loadError = !result.ok;
  } catch {
    loadError = true;
  }

  return (
    <AppShell locale={locale as "ar" | "en"} title={t("indexEyebrow")} maxWidth="wide">
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

        {loadError ? (
          <div className={`card-wahaj p-10 ${font}`}>
            <WidgetError locale={locale as "ar" | "en"} />
          </div>
        ) : items.length === 0 ? (
          <div className={`card-wahaj p-10 text-center ${font}`}>
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
                    className={`group block rounded-2xl border border-rizq-gold/20 bg-[var(--raised)] hover:bg-rizq-cream/90 hover:border-rizq-green/30 hover:shadow-sm hover:-translate-y-0.5 transition motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 p-5 ${font}`}
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
                        <p className={`text-xs text-[var(--content-muted)] ${font}`}>{t("sar")}</p>
                      </div>
                    </div>

                    {/* Lifecycle stage + resume affordance */}
                    <div dir={dir} className="mt-4 pt-3 border-t border-rizq-gold/15 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            lc.complete ? "bg-[var(--acc)]" : "bg-[var(--warn)] animate-breathe-amber"
                          }`}
                          aria-hidden
                        />
                        <span className={`${lc.complete ? "text-[var(--acc)]" : "text-[var(--warn)]"} font-medium ${font}`}>
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
