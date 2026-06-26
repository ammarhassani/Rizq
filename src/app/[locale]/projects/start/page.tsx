/**
 * /[locale]/projects/start — Project Lifecycle Wizard (spec 003), task T006.
 *
 * The "Start a project" front door: stage ① (price & propose). Frames the
 * existing Proposal Studio (ProposalFlow) with the lifecycle stepper showing
 * ① current. On finalize, ProposalFlow routes to the proposal, where the
 * existing "Create project from this proposal" CTA carries the lifecycle into
 * stage ②. Reuses the Studio — no rebuilt drafting.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/app/actions/proposals/templates";
import { AppShell } from "@/components/shell/AppShell";
import { ProposalFlow } from "@/components/proposals/ProposalFlow";
import { LifecycleStepper } from "@/components/projects/LifecycleStepper";
import { GuidedFlowOverlay } from "@/components/projects/GuidedFlowOverlay";
import { resolveLifecycle } from "@/lib/projects/lifecycle";

export const maxDuration = 60;

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Wizard" });
  return { title: `${t("startProject")} · رِزق` };
}

export default async function ProjectStartPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(getPathname({ href: "/login", locale: locale as "ar" | "en" }));
  }

  const t = await getTranslations({ locale, namespace: "Wizard" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [templatesResult, clientsRaw] = await Promise.all([
    listTemplates(),
    supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);
  const userTemplates = templatesResult.ok ? templatesResult.templates : [];
  const userClients = (clientsRaw.data ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));

  // Stage ① is current at the start (nothing exists yet).
  const lifecycle = resolveLifecycle({
    proposal: null,
    hasProject: false,
    projectHasOriginProposal: false,
    gig: null,
    invoices: [],
  });

  return (
    <AppShell locale={locale as "ar" | "en"} title={t("startProject")} maxWidth="reading">
      <GuidedFlowOverlay lifecycle={lifecycle} locale={locale as "ar" | "en"} />
      <div>
        <div className="mb-6">
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("startProject")}</h1>
        </div>

        <LifecycleStepper lifecycle={lifecycle} locale={locale as "ar" | "en"} />

        <ProposalFlow
          locale={locale as "ar" | "en"}
          specialties={[]}
          templates={userTemplates.map((tpl) => ({ id: tpl.id, name_ar: tpl.name_ar, name_en: tpl.name_en }))}
          clients={userClients}
        />
      </div>
    </AppShell>
  );
}
