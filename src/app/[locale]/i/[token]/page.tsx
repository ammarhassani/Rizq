/**
 * /[locale]/i/[token] — Public invoice share page (Phase-4 task P4.5)
 *
 * Server component. Mirrors /[locale]/p/[token] exactly but for invoices.
 * Public data comes ONLY via the get_shared_invoice RPC (returns safe artifact
 * fields); raw items/user_id/client rows are never exposed to anon requests.
 */

import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { InvoiceArtifact } from "@/components/invoices/InvoiceArtifact";
import { PrintButton } from "@/components/proposals/PrintButton";
import { LogInvoiceView } from "@/components/invoices/LogInvoiceView";
import type { InvoiceArtifactData } from "@/lib/invoices/artifact";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Params = { locale: string; token: string };

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  artifact_json: unknown;
  total_sar: number;
  due_date: string | null;
};

// ---------------------------------------------------------------------------
// Data fetcher — uses ONLY the get_shared_invoice RPC (no anon table select)
// ---------------------------------------------------------------------------

async function fetchPublicInvoice(token: string): Promise<InvoiceRow | null> {
  // Token sanity check: base64url characters only, length 8–64.
  if (!token || token.length < 8 || token.length > 64) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const supabase = await createClient();
  // Public surface = the get_shared_invoice RPC: returns ONLY safe artifact
  // fields, already filtered to public_share = true AND status <> 'draft'.
  const { data, error } = await supabase.rpc("get_shared_invoice", {
    p_token: token,
  });

  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as InvoiceRow;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArtifactData(raw: unknown): InvoiceArtifactData | null {
  // artifact_json is stored as JSONB → comes back as a plain object.
  // Defensive cast: must have a sections array.
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("sections" in raw) ||
    !Array.isArray((raw as Record<string, unknown>)["sections"])
  ) {
    return null;
  }
  return raw as InvoiceArtifactData;
}

function buildContactLinks(artifact: InvoiceArtifactData | null) {
  if (!artifact) return { email: null, whatsapp: null };
  const branding = artifact.sections.find((s) => s.id === "branding");
  if (!branding) return { email: null, whatsapp: null };
  const contact = branding.content["contact"] as
    | { email?: string | null; whatsapp?: string | null }
    | null
    | undefined;
  return {
    email: contact?.email ?? null,
    whatsapp: contact?.whatsapp ?? null,
  };
}

// ---------------------------------------------------------------------------
// generateMetadata — PDPL-safe (no client name leakage beyond the shared artifact)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, token } = await params;
  const row = await fetchPublicInvoice(token);

  if (!row) {
    return { title: "رِزق" };
  }

  const artifact = parseArtifactData(row.artifact_json);

  const invoiceNumber = row.invoice_number ?? null;
  const totalSar = typeof row.total_sar === "number" ? Math.round(row.total_sar) : null;

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US");

  // Pull branding name from artifact for OG title (it's in the shared artifact — not secret)
  const branding = artifact?.sections.find((s) => s.id === "branding");
  const brandName =
    typeof branding?.content["brandName"] === "string"
      ? (branding.content["brandName"] as string)
      : null;

  const description =
    locale === "ar"
      ? `فاتورة${invoiceNumber ? ` رقم ${invoiceNumber}` : ""}. الإجمالي: ${totalSar ? fmt.format(totalSar) + " ريال" : "غير محدّد"}`
      : `Invoice${invoiceNumber ? ` #${invoiceNumber}` : ""}. Total: ${totalSar ? fmt.format(totalSar) + " SAR" : "N/A"}`;

  const title = locale === "ar" ? "فاتورة رِزق" : "Rizq Invoice";

  return {
    title,
    description,
    openGraph: {
      title: brandName
        ? `${brandName}, ${locale === "ar" ? "فاتورة رِزق" : "Rizq Invoice"}`
        : title,
      description,
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function InvoiceSharePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, token } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const row = await fetchPublicInvoice(token);
  if (!row) notFound();

  const artifact = parseArtifactData(row.artifact_json);
  if (!artifact) notFound();

  // Use the URL locale for the artifact render (no brief_language on invoices).
  const artifactLocale: "ar" | "en" = locale === "en" ? "en" : "ar";

  const t = await getTranslations({ locale, namespace: "Invoices.share" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const { email, whatsapp } = buildContactLinks(artifact);

  // WhatsApp contact link (from branding contact — not the share URL).
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : null;
  const emailHref = email ? `mailto:${email}` : null;

  return (
    <>
      {/* Print styles — A4, hide chrome, keep invoice artifact readable */}
      <style>{`
        @media print {
          nav, header, .print-hidden { display: none !important; }
          body { background: white; }
          #invoice-artifact { max-width: 100% !important; }
          section { break-inside: avoid; page-break-inside: avoid; }
          @page { size: A4; margin: 20mm 15mm; }
        }
      `}</style>

      <div className="relative min-h-screen flex flex-col bg-paper" dir={dir}>
        {/* Subtle dot grid — same as /p/[token] */}
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
          <InvoiceArtifact data={artifact} locale={artifactLocale} />

          {/* Action row */}
          <div
            className={`print-hidden mt-10 pt-6 border-t border-rizq-gold/20 flex flex-wrap items-center gap-3 ${font}`}
          >
            {/* Download PDF */}
            <PrintButton label={t("downloadPdf")} locale={locale as "ar" | "en"} />

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
      <LogInvoiceView token={token} />
    </>
  );
}
