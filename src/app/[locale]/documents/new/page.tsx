/**
 * /[locale]/documents/new — Upload a new document. Phase-6 task P6.5.
 * Server component shell + client form.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  return { title: locale === "ar" ? "رفع وثيقة — رِزق" : "Upload document — Rizq" };
}

export default async function DocumentNewPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const { data: catsRaw } = await supabase
    .from("document_categories")
    .select("id, name_ar, name_en")
    .eq("enabled", true)
    .order("sort_order");

  const categories = (catsRaw ?? []) as { id: string; name_ar: string; name_en: string }[];

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />
      <SiteNav locale={locale as "ar" | "en"} />
      <main
        className="relative z-10 flex-1 mx-auto w-full max-w-2xl px-6 sm:px-10 py-12 sm:py-16"
        dir={dir}
      >
        <Link
          href="/documents"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "الوثائق" : "Documents"}
        </Link>

        <h1 className={`text-2xl font-bold text-rizq-ink mb-6 ${font}`}>
          {isAr ? "رفع وثيقة جديدة" : "Upload a new document"}
        </h1>

        <div className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6 sm:p-8">
          <DocumentUploadForm locale={locale as "ar" | "en"} categories={categories} />
        </div>
      </main>
    </div>
  );
}
