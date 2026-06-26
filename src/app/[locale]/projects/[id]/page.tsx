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
import { GuidedFlowOverlay } from "@/components/projects/GuidedFlowOverlay";
import { ProjectLifecycleCta } from "@/components/projects/ProjectLifecycleCta";
import { ProjectMoneyPanel } from "@/components/projects/ProjectMoneyPanel";
import { ProjectMoneyDetails } from "@/components/projects/ProjectMoneyDetails";
import { GigStatusQuickEdit } from "@/components/income/GigStatusQuickEdit";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { ProjectFilesClient } from "@/components/projects/ProjectFilesClient";
import { DeliverablesTab } from "@/components/projects/DeliverablesTab";
import { getProjectDeliverables } from "@/app/actions/projects/deliverables";
import { TasksTab } from "@/components/projects/TasksTab";
import { getProjectTasks } from "@/app/actions/projects/tasks";
import { IntegrationsTab } from "@/components/projects/IntegrationsTab";
import { listProviderConnections } from "@/app/actions/projects/integrations/connect";
import { ProjectInvoicesList } from "@/components/projects/ProjectInvoicesList";
import { ProjectDeleteControl } from "@/components/projects/ProjectDeleteControl";

type Params = { locale: string; id: string };

export async function generateMetadata() {
  return { title: "مشروع · رِزق" };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, id } = await params;
  const { tab: tabParam } = await searchParams;
  const VALID_TABS = ["files", "deliverables", "tasks", "integrations"] as const;
  const tab: "overview" | "files" | "deliverables" | "tasks" | "integrations" =
    (VALID_TABS as readonly string[]).includes(tabParam ?? "")
      ? (tabParam as "files" | "deliverables" | "tasks" | "integrations")
      : "overview";
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

  // Files tab data (only when active).
  type ProjectFile = { id: string; title: string; file_name: string; kind: "input" | "deliverable" };
  let files: ProjectFile[] = [];
  if (tab === "files") {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, title_ar, file_name, project_doc_kind")
      .eq("project_id", id)
      .eq("user_id", userData.user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    files = (docs ?? []).map((d) => ({
      id: d.id as string,
      title: (d.title_ar as string) ?? (d.file_name as string),
      file_name: (d.file_name as string) ?? "",
      kind: (d.project_doc_kind as "input" | "deliverable") ?? "input",
    }));
  }

  // Deliverables tab data (only when active).
  const deliverablesResult = tab === "deliverables" ? await getProjectDeliverables(id) : null;
  const deliverables = deliverablesResult?.ok ? deliverablesResult.items : [];

  // Tasks tab data (only when active).
  const tasksResult = tab === "tasks" ? await getProjectTasks(id) : null;
  const tasksBundle = tasksResult?.ok ? tasksResult.bundle : { tasks: [], milestones: [] };

  // Integrations tab data (only when active). The connection is account-level;
  // here we just read its status to enable repo-attaching.
  const connections = tab === "integrations" ? await listProviderConnections() : [];
  const githubConn = connections.find((c) => c.provider === "github" && c.status === "active") ?? null;

  return (
    <AppShell locale={locale as "ar" | "en"} title={project.title as string} maxWidth="reading">
      <GuidedFlowOverlay lifecycle={lifecycle} locale={locale as "ar" | "en"} />
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
        <h1 className={`text-2xl font-bold text-rizq-ink leading-snug mb-4 ${font}`}>
          {project.title}
        </h1>

        {/* Tabs */}
        <ProjectTabs
          locale={locale as "ar" | "en"}
          projectId={id}
          current={tab}
          tabs={["overview", "files", "deliverables", "tasks", "integrations"]}
        />

        {tab === "files" && (
          <ProjectFilesClient locale={locale as "ar" | "en"} projectId={id} docs={files} />
        )}

        {tab === "deliverables" && (
          <DeliverablesTab locale={locale as "ar" | "en"} items={deliverables} />
        )}

        {tab === "tasks" && (
          <TasksTab
            locale={locale as "ar" | "en"}
            projectId={id}
            tasks={tasksBundle.tasks}
            milestones={tasksBundle.milestones}
          />
        )}

        {tab === "integrations" && (
          <IntegrationsTab
            locale={locale as "ar" | "en"}
            projectId={id}
            githubConnected={!!githubConn}
            githubLogin={githubConn?.external_login ?? null}
            links={integrations ?? []}
          />
        )}

        {tab === "overview" && (
        <>
        {/* Lifecycle progress (derived) */}
        <LifecycleStepper
          lifecycle={lifecycle}
          locale={locale as "ar" | "en"}
          targets={{
            // Skipped proposal (billed directly) → go write one (linked back to this
            // project as its origin); else open the origin quote.
            proposal: originProposal ? `/proposals/${originProposal.id}` : `/proposals/new?for_project=${id}`,
            project: `/projects/${id}`,
            invoice: latestInvoiceId ? `/invoices/${latestInvoiceId}` : undefined,
          }}
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

        {/* Status control (mark paid / delivered / overdue …) */}
        {gig && (
          <div dir={dir} className="mb-6 flex items-center gap-3">
            <span className={`text-xs text-rizq-ink-soft/70 ${font}`}>{isAr ? "الحالة" : "Status"}</span>
            <GigStatusQuickEdit gigId={gig.id as string} current={gig.status as string} locale={locale as "ar" | "en"} />
          </div>
        )}

        {/* Stage ② money details — amount, deposit %, delivery, payment method */}
        {gig && (
          <ProjectMoneyDetails
            locale={locale as "ar" | "en"}
            gigId={gig.id as string}
            initial={{
              amount_sar: gig.amount_sar ?? null,
              deposit_pct: gig.deposit_pct ?? null,
              delivery_date: gig.delivery_date ?? null,
              payment_method: gig.payment_method ?? null,
            }}
          />
        )}

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

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-rizq-gold/20">
          <ProjectDeleteControl locale={locale as "ar" | "en"} projectId={id} />
        </div>
        </>
        )}
      </div>
    </AppShell>
  );
}
