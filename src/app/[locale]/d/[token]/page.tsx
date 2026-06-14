/**
 * /[locale]/d/[token] — Public document share page. Phase-6 task P6.5.
 * Server component. No auth required.
 * Public data via get_shared_document RPC only — no anon table SELECT.
 */
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { FileText, Download } from "lucide-react";

type Params = { locale: string; token: string };

type SharedDoc = {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  storage_bucket: string;
};

async function fetchSharedDocument(token: string): Promise<SharedDoc | null> {
  // Token sanity check
  if (!token || token.length < 8 || token.length > 64) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_document", { p_token: token });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as SharedDoc;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, token } = await params;
  const doc = await fetchSharedDocument(token);
  if (!doc) return { title: "رِزق" };
  const title = locale === "ar" ? (doc.title_ar ?? doc.file_name) : (doc.title_en ?? doc.file_name);
  return { title: `${title} · رِزق` };
}

export default async function DocumentSharePage({ params }: { params: Promise<Params> }) {
  const { locale, token } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const doc = await fetchSharedDocument(token);
  if (!doc) notFound();

  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Generate a short-lived signed URL for the download button (server-side)
  const supabase = await createClient();
  const bucket = doc.storage_bucket ?? "documents";
  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(doc.file_path, 60 * 10); // 10 min

  const downloadUrl = signed?.signedUrl ?? null;
  const docTitle = isAr ? (doc.title_ar ?? doc.file_name) : (doc.title_en ?? doc.file_name);

  return (
    <div className="relative min-h-screen flex flex-col bg-paper" dir={dir}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(200, 169, 81, 0.20) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      />
      <SiteNav locale={locale as "ar" | "en"} />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-2xl px-4 sm:px-8 py-10 sm:py-14">
        <div className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 sm:p-10 ${font}`}>
          {/* Doc icon + title */}
          <div className="flex items-start gap-4 mb-6">
            <span className="flex-shrink-0 w-12 h-12 rounded-2xl bg-rizq-green/8 flex items-center justify-center text-rizq-green">
              <FileText size={24} />
            </span>
            <div>
              <h1 className={`text-xl font-bold text-rizq-ink ${font}`}>{docTitle}</h1>
              <p className="mt-1 text-sm text-rizq-ink-soft/60">{doc.file_name}</p>
            </div>
          </div>

          {/* Notice */}
          <p className={`text-sm text-rizq-ink-soft mb-6 ${font}`}>
            {isAr
              ? "تمت مشاركة هذه الوثيقة معك عبر رِزق. الرابط مؤقت وسينتهي قريبًا."
              : "This document was shared with you via Rizq. The link is temporary and will expire soon."}
          </p>

          {/* Download button */}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-all ${font}`}
            >
              <Download size={15} />
              {isAr ? "تحميل الملف" : "Download file"}
            </a>
          ) : (
            <p className={`text-sm text-red-600 ${font}`}>
              {isAr ? "تعذّر تحضير رابط التحميل." : "Could not prepare download link."}
            </p>
          )}
        </div>

        {/* Rizq attribution */}
        <div className={`mt-6 text-center ${font}`}>
          <Link href="/" className="text-xs text-rizq-ink-soft/50 hover:text-rizq-green transition-colors">
            {isAr ? "مُنشأ بواسطة رِزق. سعّر بثقة، اقبض رزقك" : "Shared via Rizq. Price with confidence, earn your rizq"}
          </Link>
        </div>
      </main>
    </div>
  );
}
