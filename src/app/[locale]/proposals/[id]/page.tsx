/**
 * /[locale]/proposals/[id] — Proposal detail page.
 * Phase-2 task 2.9 (frontend, part 2).
 *
 * Server component. Auth-gated. Fetches the proposal by id (RLS → owner only).
 * Renders the artifact, version history, and action buttons.
 */

import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { ProposalArtifact } from "@/components/proposals/ProposalArtifact";
import { ProposalDetailActions } from "@/components/proposals/ProposalDetailActions";
import { EditProposalForm } from "@/components/proposals/EditProposalForm";
import type { ArtifactData } from "@/lib/proposals/artifact";
import type { Scope } from "@/lib/ai/scope";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Params = { locale: string; id: string };

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  return { title: `عرض سعر — رِزق` };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !isFinite(n)) return "";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    ).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, id } = await params;
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

  const t = await getTranslations({ locale, namespace: "Proposals.detail" });
  const tList = await getTranslations({ locale, namespace: "Proposals.list" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  // Fetch proposal (RLS enforces owner-only)
  const { data: proposal, error: proposalErr } = await supabase
    .from("proposals")
    .select(
      "id, status, client_name, price_anchor, price_min, price_max, created_at, expires_at, artifact_json, scope_json, public_share, share_token, version"
    )
    .eq("id", id)
    .single();
  // Note: client_name and scope_json are already included above for EditProposalForm.

  if (proposalErr || !proposal) notFound();

  // Fetch version history
  const { data: versions } = await supabase
    .from("proposal_versions")
    .select("version, change_summary, created_at, price_anchor")
    .eq("proposal_id", id)
    .order("version", { ascending: false });

  const versionRows = (versions ?? []) as Array<{
    version: number;
    change_summary: string | null;
    created_at: string | null;
    price_anchor: number | null;
  }>;

  // Check expiry
  const isExpired =
    proposal.expires_at != null &&
    new Date(proposal.expires_at as string) < new Date();

  const artifactData = proposal.artifact_json as ArtifactData | null;
  const scopeJson = proposal.scope_json as Scope | null;
  const canEdit =
    proposal.status === "final" || proposal.status === "sent";

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
        {/* Back link */}
        <Link
          href="/proposals"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "عروضي" : "My proposals"}
        </Link>

        {/* Expired notice */}
        {isExpired && (
          <div
            className={`mb-6 rounded-2xl border border-amber-300/50 bg-amber-50/80 px-5 py-4 text-sm text-amber-800 ${font}`}
            role="alert"
          >
            {t("expiredNotice")}
          </div>
        )}

        {/* Artifact */}
        {artifactData ? (
          <ProposalArtifact data={artifactData} locale={locale as "ar" | "en"} />
        ) : (
          <div
            className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 p-8 text-center text-sm text-rizq-ink-soft ${font}`}
          >
            {isAr ? "العرض غير متوفر حاليًا." : "Proposal data is not available."}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-4">
          <ProposalDetailActions
            locale={locale as "ar" | "en"}
            proposalId={id}
            status={proposal.status as string ?? "draft"}
            publicShare={proposal.public_share as boolean ?? false}
            shareToken={proposal.share_token as string | null}
          />

          {/* Edit affordance — only for final / sent proposals */}
          {canEdit && (
            <EditProposalForm
              locale={locale as "ar" | "en"}
              proposalId={id}
              initialDescription={
                ((scopeJson?.extras as Record<string, unknown> | undefined)
                  ?.["description"] as string | null) ?? ""
              }
              initialDeliverables={scopeJson?.deliverables ?? []}
              initialAnchor={Number(proposal.price_anchor)}
              priceMin={Number(proposal.price_min)}
              priceMax={Number(proposal.price_max)}
            />
          )}
        </div>

        {/* Version history */}
        {versionRows.length > 0 && (
          <section className="mt-10">
            <h2
              className={`eyebrow mb-4 text-rizq-green ${font}`}
            >
              {t("versionHistory")}
            </h2>

            <div className="space-y-2">
              {versionRows.map((v) => (
                <div
                  key={v.version}
                  className={`flex items-start justify-between gap-4 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 ${font}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rizq-green leading-none">
                      {t("versionLabel", { v: v.version })}
                    </p>
                    <p className="text-xs text-rizq-ink-soft mt-1 truncate">
                      {v.change_summary ?? t("noSummary")}
                    </p>
                    {v.created_at && (
                      <p className="text-[11px] text-rizq-ink-soft/60 mt-0.5">
                        {fmtDate(v.created_at, locale as "ar" | "en")}
                      </p>
                    )}
                  </div>
                  {v.price_anchor != null && (
                    <div className="shrink-0 text-end">
                      <p className="tabular font-sans text-base font-semibold text-rizq-ink leading-none">
                        {fmtPrice(v.price_anchor, locale as "ar" | "en")}
                      </p>
                      <p className={`text-[11px] text-rizq-ink-soft/60 mt-0.5 ${font}`}>
                        {tList("currency")}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
