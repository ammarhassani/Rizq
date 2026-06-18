/**
 * /[locale]/proposals/new — Proposal generate flow page.
 * Phase-2 task 2.9.
 *
 * Server component. Auth-gated: redirects to /[locale]/login when not signed in.
 * Loads reference data (cities, tiers) for the form selects.
 * Passes defaultCitySlug derived from the user's stored city preference.
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

// Studio's generateProposal Server Action runs the heaviest AI call (scope
// extraction: large few-shot prompt + complex schema). Give it room so Vercel
// doesn't kill the function before the 20s AI abort.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Params = { locale: string };

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Proposals.new" });
  return { title: `${t("title")} · رِزق` };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalNewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Auth gate
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({
      href: "/login",
      locale: locale as "ar" | "en",
    });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Proposals.new" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  // Templates + clients only. City + experience tier are resolved server-side
  // at generation time (client city + the freelancer's profile), so the form
  // does not ask for them.
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
  const userClients = (clientsRaw.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
  }));

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "عرض جديد" : "New Proposal"} maxWidth="reading">
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
          <p className={`mt-3 text-base sm:text-lg text-rizq-ink-soft max-w-xl ${font}`}>
            {t("subtitle")}
          </p>
        </div>

        {/* Client orchestrator */}
        <ProposalFlow
          locale={locale as "ar" | "en"}
          specialties={[]} /* specialty is AI-detected from brief — no manual select */
          templates={userTemplates.map((t) => ({
            id: t.id,
            name_ar: t.name_ar,
            name_en: t.name_en,
          }))}
          clients={userClients}
        />
      </div>
    </AppShell>
  );
}

