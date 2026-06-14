/**
 * /[locale]/proposals/templates — Template manager page.
 * Phase-2 task 2.10.
 *
 * Server component. Auth-gated: redirects to /[locale]/login when not signed in.
 * Lists the owner's proposal_templates via the listTemplates server action,
 * then delegates mutations to the TemplateList client island.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/app/actions/proposals/templates";
import { AppShell } from "@/components/shell/AppShell";
import { TemplateList } from "@/components/proposals/TemplateList";

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
  const t = await getTranslations({
    locale,
    namespace: "Proposals.templates",
  });
  return { title: `${t("title")} — رِزق` };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalTemplatesPage({
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

  const t = await getTranslations({
    locale,
    namespace: "Proposals.templates",
  });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  // Load templates
  const templatesResult = await listTemplates();
  const templates = templatesResult.ok ? templatesResult.templates : [];

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "قوالب العروض" : "Proposal Templates"}>
      <div
        className="mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Back link */}
        <Link
          href="/proposals"
          className={`text-xs text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-6 inline-block ${font}`}
        >
          {isAr ? "→" : "←"} {t("backToProposals")}
        </Link>

        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
            <Link
              href="/proposals/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {t("newProposal")}
            </Link>
          </div>
          <p className={`mt-3 text-base text-rizq-ink-soft max-w-xl ${font}`}>
            {t("subtitle")}
          </p>
        </div>

        {/* Template list (client island) */}
        <TemplateList
          locale={locale as "ar" | "en"}
          templates={templates}
        />
      </div>
    </AppShell>
  );
}
