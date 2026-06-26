/**
 * /[locale]/projects/[id] — Project detail page. Feature 002 (Project hub), task T022.
 * Server component, auth-gated. Composes the project's money, origin proposal,
 * invoices, and a labeled integrations stub. Mobile-first, RTL.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { getProject } from "@/app/actions/projects/getProject";
import { resolveLifecycle } from "@/lib/projects/lifecycle";
import { LifecycleStepper } from "@/components/projects/LifecycleStepper";
import { ProjectLifecycleCta } from "@/components/projects/ProjectLifecycleCta";
import { ProjectMoneyPanel } from "@/components/projects/ProjectMoneyPanel";
import { ProjectInvoicesList } from "@/components/projects/ProjectInvoicesList";
import { ProjectIntegrationsSlot } from "@/components/projects/ProjectIntegrationsSlot";
import { ProjectDeleteControl } from "@/components/projects/ProjectDeleteControl";

type Params = { locale: string; id: string };

export async function generateMetadata() {
  return { title: "مشروع · رِزق" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(getPathname({ href: "/login", locale: locale as "ar" | "en" }));
  }

  const result = await getProject(id);
  if (!result.ok) notFound();
  const { project, gig, originProposal, invoices, integrations, clientName } = result.bundle;

  const t = await getTranslations({ locale, namespace: "Projects" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const clientId = (project.client_id as string | null) ?? null;

  // Derive the lifecycle from the data already loaded (no extra fetch).
  const lifecycle = resolveLifecycle({
    proposal: originProposal ? { status: originProposal.status as string } : null,
    hasProject: true,
    projectHasOriginProposal: !!project.origin_proposal_id,
    gig: gig ? { amount_sar: Number(gig.amount_sar), status: gig.status as string } : null,
    invoices: (invoices ?? []).map((inv) => ({ status: inv.status as string })),
  });
  const latestInvoiceId = (invoices?.[0]?.id as string | undefined) ?? null;

  return (
    <AppShell locale={locale as "ar" | "en"} title={project.title as string} maxWidth="reading">
      <div dir={dir}>
        {/* Back to portfolio */}
        <Link
          href="/income"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {t("backToIncome")}
        </Link>

        {/* Title */}
        <h1 className={`text-2xl font-bold text-rizq-ink leading-snug mb-6 ${font}`}>
          {project.title}
        </h1>

        {/* Lifecycle progress (derived) */}
        <LifecycleStepper
          lifecycle={lifecycle}
          locale={locale as "ar" | "en"}
          cta={
            <ProjectLifecycleCta
              locale={locale as "ar" | "en"}
              nextAction={lifecycle.nextAction}
              projectId={id}
              gigId={(gig?.id as string | undefined) ?? null}
              invoiceId={latestInvoiceId}
            />
          }
        />

        {/* Money (single-project view) */}
        <ProjectMoneyPanel gig={gig} locale={locale as "ar" | "en"} />

        {/* Origin proposal */}
        {originProposal && (
          <section className="mb-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("originProposalTitle")}</h2>
            <Link
              href={`/proposals/${originProposal.id}` as `/proposals/${string}`}
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
            >
              <span className="flex items-center gap-2">
                <span className={`text-sm font-medium text-rizq-ink ${font}`}>{t("viewProposal")}</span>
                <span className="inline-flex items-center rounded-full bg-rizq-green/10 text-rizq-green px-2 py-0.5 text-xs">
                  {t("originProposalRole")}
                </span>
              </span>
              <span className="text-sm text-rizq-ink-soft/60">→</span>
            </Link>
          </section>
        )}

        {/* Linked client */}
        {clientName && clientId && (
          <section className="mb-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{isAr ? "العميل المرتبط" : "Linked client"}</h2>
            <Link
              href={`/clients/${clientId}` as `/clients/${string}`}
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
            >
              <span className={`text-sm font-medium text-rizq-ink ${font}`}>{clientName}</span>
              <span className="text-sm text-rizq-ink-soft/60">→</span>
            </Link>
          </section>
        )}

        {/* Invoices */}
        <ProjectInvoicesList invoices={invoices} locale={locale as "ar" | "en"} />

        {/* Integrations (stub) */}
        <ProjectIntegrationsSlot integrations={integrations} locale={locale as "ar" | "en"} />

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-rizq-gold/20">
          <ProjectDeleteControl locale={locale as "ar" | "en"} projectId={id} />
        </div>
      </div>
    </AppShell>
  );
}
