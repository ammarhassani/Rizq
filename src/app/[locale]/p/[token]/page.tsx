/**
 * /[locale]/p/[token] — Public proposal share page (Phase-2 task 2.8)
 *
 * Server component. Mirrors the pattern from /[locale]/r/[id]/page.tsx.
 * Public data comes via the get_shared_proposal RPC (returns ONLY safe artifact
 * fields); raw brief_text/scope_json/extraction/user_id are never exposed.
 */

import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { ProposalArtifact } from "@/components/proposals/ProposalArtifact";
import { ProposalPrintStyles } from "@/components/proposals/ProposalPrintStyles";
import { PrintButton } from "@/components/proposals/PrintButton";
import { LogProposalView } from "@/components/proposals/LogProposalView";
import type { ArtifactData } from "@/lib/proposals/artifact";
import { isValidShareToken } from "@/lib/proposals/shareToken";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Params = { locale: string; token: string };

type ProposalRow = {
  id: string;
  status: string;
  artifact_json: unknown;
  brief_language: string | null;
};

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

async function fetchPublicProposal(token: string): Promise<ProposalRow | null> {
  if (!isValidShareToken(token)) return null;

  const supabase = await createClient();
  // Public surface = the get_shared_proposal RPC: returns ONLY safe artifact
  // fields, already filtered to public_share = true AND status <> 'draft'.
  const { data, error } = await supabase.rpc("get_shared_proposal", {
    p_token: token,
  });

  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as ProposalRow;
}

/**
 * Probe the share-link state WITHOUT exposing any proposal content. Lets the page
 * show a distinct "publisher disabled this link" view instead of a 404 (bug ④).
 */
async function fetchPublicProposalState(
  token: string,
): Promise<"active" | "disabled" | "missing"> {
  if (!isValidShareToken(token)) return "missing";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_proposal_state", {
    p_token: token,
  });
  if (error || typeof data !== "string") return "missing";
  return data === "active" || data === "disabled" ? data : "missing";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArtifactData(raw: unknown): ArtifactData | null {
  // artifact_json is stored as JSONB → comes back as a plain object.
  // We cast defensively: must have a sections array.
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("sections" in raw) ||
    !Array.isArray((raw as Record<string, unknown>)["sections"])
  ) {
    return null;
  }
  return raw as ArtifactData;
}

function buildContactLinks(artifact: ArtifactData | null) {
  if (!artifact) return { email: null, whatsapp: null };
  // New document model carries contact on `cover`; legacy on `branding`.
  const section =
    artifact.sections.find((s) => s.id === "cover") ??
    artifact.sections.find((s) => s.id === "branding");
  if (!section) return { email: null, whatsapp: null };
  const contact = section.content["contact"] as
    | { email?: string | null; whatsapp?: string | null }
    | null
    | undefined;
  return {
    email: contact?.email ?? null,
    whatsapp: contact?.whatsapp ?? null,
  };
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, token } = await params;
  const row = await fetchPublicProposal(token);

  if (!row) {
    return { title: "رِزق" };
  }

  const artifact = parseArtifactData(row.artifact_json);
  const pricing = artifact?.sections.find((s) => s.id === "pricing");
  // New model carries brand on `cover`; legacy on `branding`.
  const branding =
    artifact?.sections.find((s) => s.id === "cover") ??
    artifact?.sections.find((s) => s.id === "branding");

  const brandName =
    typeof branding?.content["brandName"] === "string"
      ? branding.content["brandName"]
      : typeof branding?.content["name"] === "string"
      ? (branding.content["name"] as string)
      : null;

  const anchor =
    typeof pricing?.content["anchor"] === "number"
      ? Math.round(pricing.content["anchor"] as number)
      : null;

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");

  const description =
    locale === "ar"
      ? `عرض تقديمي من ${brandName ?? "مستقل"}. السعر المقترح: ${anchor ? fmt.format(anchor) + " ريال" : "غير محدّد"}`
      : `Proposal from ${brandName ?? "freelancer"}. Proposed price: ${anchor ? fmt.format(anchor) + " SAR" : "N/A"}`;

  const title =
    locale === "ar"
      ? `عرض تقديمي رِزق`
      : `Rizq Proposal`;

  return {
    title,
    description,
    openGraph: {
      title: brandName ? `${brandName}, ${locale === "ar" ? "عرض رِزق" : "Rizq Proposal"}` : title,
      description,
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ProposalSharePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, token } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Proposals.share" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const row = await fetchPublicProposal(token);
  if (!row) {
    // The content fetch filters out disabled links — distinguish an intentionally
    // disabled link (show access-denied) from one that never existed (404).
    const state = await fetchPublicProposalState(token);
    if (state !== "disabled") notFound();
    return (
      <div className="relative min-h-screen flex flex-col bg-paper" dir={dir}>
        <SiteNav locale={locale} />
        <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-20">
          <div className={`max-w-md text-center ${font}`}>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rizq-gold/15 text-rizq-gold-dark">
              <Lock size={26} strokeWidth={1.8} aria-hidden />
            </div>
            <h1 className={`display-3 text-rizq-ink mb-3 ${font}`}>{t("disabledTitle")}</h1>
            <p className="text-rizq-ink-soft leading-relaxed">{t("disabledBody")}</p>
            <Link href="/" className="mt-6 inline-block text-sm text-rizq-green hover:underline">
              {t("generatedBy")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const artifact = parseArtifactData(row.artifact_json);
  if (!artifact) notFound();

  // The proposal's own locale wins for the artifact rendering direction/font.
  // The URL locale controls the UI chrome (nav, action row).
  const artifactLocale: "ar" | "en" =
    row.brief_language === "en" ? "en" : "ar";

  const { email, whatsapp } = buildContactLinks(artifact);

  // WhatsApp contact link (from branding contact, not share URL).
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : null;
  const emailHref = email ? `mailto:${email}` : null;

  return (
    <>
      {/* Shared print/PDF stylesheet (A4, cover page, hide chrome, brand footer) */}
      <ProposalPrintStyles />

      <div className="relative min-h-screen flex flex-col bg-paper" dir={dir}>
        {/* Subtle dot grid — same as /r/[id] */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.5] pointer-events-none print-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(200, 169, 81, 0.20) 1px, transparent 1.6px)",
            backgroundSize: "30px 30px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          }}
        />

        {/* Nav */}
        <SiteNav locale={locale} />

        {/* Artifact */}
        <main className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-4 sm:px-8 py-10 sm:py-14">
          <ProposalArtifact data={artifact} locale={artifactLocale} />

          {/* Action row */}
          <div
            className={`print-hidden mt-10 pt-6 border-t border-rizq-gold/20 flex flex-wrap items-center gap-3 ${font}`}
          >
            {/* Download PDF */}
            <PrintButton label={t("downloadPdf")} locale={locale} />

            {/* Contact freelancer — WhatsApp preferred, email fallback */}
            {(whatsappHref || emailHref) && (
              <a
                href={(whatsappHref ?? emailHref)!}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-5 py-2.5 text-sm font-medium hover:bg-rizq-green/10 transition-all ${font}`}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path
                    d="M7.5.5A7 7 0 0 0 1.27 10.9L.5 14.5l3.7-.75A7 7 0 1 0 7.5.5zm0 12.73a5.73 5.73 0 0 1-3-.84l-.22-.13-2.2.45.47-2.14-.14-.23A5.75 5.75 0 1 1 7.5 13.23zm3.15-4.3c-.17-.09-1-.5-1.17-.55-.16-.06-.28-.09-.4.09-.12.17-.47.55-.57.66-.1.12-.21.13-.38.05-.17-.09-.73-.27-1.4-.86a5.23 5.23 0 0 1-.97-1.2c-.1-.17-.01-.27.08-.36.08-.08.17-.21.26-.32.09-.1.12-.18.18-.3.06-.12.03-.22-.02-.31-.05-.09-.4-1-.55-1.37-.14-.36-.29-.31-.4-.32H5.38c-.12 0-.3.04-.46.21C4.76 5.07 4.3 5.5 4.3 6.4s.63 1.77.72 1.9c.08.12 1.24 1.88 3 2.64.42.18.75.29 1 .37.42.13.8.11 1.1.07.34-.05 1.04-.42 1.18-.83.15-.41.15-.76.1-.83-.04-.08-.16-.12-.34-.21z"
                    fill="currentColor"
                  />
                </svg>
                <span>{t("contactFreelancer")}</span>
              </a>
            )}

            {/* Generated by Rizq */}
            <Link
              href="/"
              className={`ms-auto text-xs text-rizq-ink-soft/60 hover:text-rizq-green transition-colors ${font}`}
            >
              {t("generatedBy")}
            </Link>
          </div>
        </main>
      </div>

      {/* Fire view log on mount (client island) */}
      <LogProposalView token={token} />
    </>
  );
}
