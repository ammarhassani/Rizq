/**
 * /[locale]/proposals — Proposal list page.
 * Phase-2 task 2.9 (frontend, part 2).
 *
 * Server component. Auth-gated: redirects to /[locale]/login when not signed in.
 * Fetches owner's proposals ordered by created_at desc (RLS scopes to owner).
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import type { ProposalRow } from "@/components/proposals/ProposalCard";

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
  const t = await getTranslations({ locale, namespace: "Proposals.list" });
  return { title: `${t("title")} — رِزق` };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalsListPage({
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

  const t = await getTranslations({ locale, namespace: "Proposals.list" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  // Fetch proposals for this user (RLS enforces owner-only)
  const { data: proposals } = await supabase
    .from("proposals")
    .select(
      "id, status, client_name, price_anchor, created_at, scope_json, specialty_id"
    )
    .order("created_at", { ascending: false });

  const rows = (proposals ?? []) as ProposalRow[];

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      {/* Dot grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />

      <SiteNav locale={locale as "ar" | "en"} />

      <main
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header row */}
        <div className="mb-8 sm:mb-12 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t("eyebrow")}</p>
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
            <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>
              {t("subtitle")}
            </p>
          </div>

          {/* New proposal CTA */}
          <Link
            href="/proposals/new"
            className={`shrink-0 inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
          >
            {t("newProposal")}
          </Link>
        </div>

        {/* List or empty state */}
        {rows.length === 0 ? (
          <EmptyState t={t} locale={locale as "ar" | "en"} font={font} />
        ) : (
          <div className="space-y-3">
            {rows.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                locale={locale as "ar" | "en"}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({
  t,
  locale,
  font,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"Proposals.list">>>;
  locale: "ar" | "en";
  font: string;
}) {
  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-10 text-center ${font}`}
    >
      {/* Decorative seal placeholder */}
      <div
        aria-hidden
        className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-rizq-gold/30 bg-rizq-green/8 flex items-center justify-center"
      >
        <span className="font-arabic text-2xl font-bold text-rizq-green leading-none">
          ر
        </span>
      </div>

      <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>
        {t("emptyTitle")}
      </h2>
      <p className={`text-sm text-rizq-ink-soft mb-6 max-w-sm mx-auto ${font}`}>
        {t("emptyBody")}
      </p>

      <Link
        href="/proposals/new"
        className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
      >
        {t("emptyCta")}
        <span className="inline-block rtl:rotate-180">→</span>
      </Link>
    </div>
  );
}
