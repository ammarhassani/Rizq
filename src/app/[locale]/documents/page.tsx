/**
 * /[locale]/documents — Document Vault list page. Phase-6 task P6.5.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { DocumentCard, type DocumentRow } from "@/components/documents/DocumentCard";

type Params = { locale: string };

type CategoryRow = {
  id: string;
  name_ar: string;
  name_en: string;
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  return { title: locale === "ar" ? "خزنة الوثائق — رِزق" : "Document Vault — Rizq" };
}

export default async function DocumentsPage({ params }: { params: Promise<Params> }) {
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

  // Fetch categories
  const { data: catsRaw } = await supabase
    .from("document_categories")
    .select("id, name_ar, name_en")
    .eq("enabled", true)
    .order("sort_order");

  const cats = (catsRaw ?? []) as CategoryRow[];
  const catsMap = Object.fromEntries(cats.map((c) => [c.id, { name_ar: c.name_ar, name_en: c.name_en }]));

  // Fetch documents
  const { data: docsRaw } = await supabase
    .from("documents")
    .select("id, title_ar, file_name, file_type, category, expiry_date, reminder_days_before, tags, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const docs = (docsRaw ?? []) as DocumentRow[];

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
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20 pb-28"
        dir={dir}
      >
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="eyebrow mb-3">{isAr ? "خزنة الوثائق" : "Document Vault"}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>
            {isAr ? "وثائقي" : "My documents"}
          </h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>
            {isAr
              ? "وثائقك الرسمية في مكان واحد. آمنة، مصنّفة، مع تنبيهات الانتهاء."
              : "Your official documents in one place. Secure, categorized, with expiry alerts."}
          </p>
        </div>

        {/* Document list or empty state */}
        {docs.length === 0 ? (
          <div dir={dir} className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-10 text-center ${font}`}>
            <div aria-hidden className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-rizq-gold/30 bg-rizq-green/8 flex items-center justify-center">
              <span className="font-arabic text-2xl font-bold text-rizq-green leading-none">ر</span>
            </div>
            <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>
              {isAr ? "لا توجد وثائق بعد" : "No documents yet"}
            </h2>
            <p className={`text-sm text-rizq-ink-soft mb-6 max-w-sm mx-auto ${font}`}>
              {isAr
                ? "ارفع أول وثيقة — شهادة ضريبية، عقد، سجل تجاري..."
                : "Upload your first document — tax certificate, contract, commercial registration..."}
            </p>
            <Link
              href="/documents/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {isAr ? "رفع وثيقة" : "Upload document"}
              <span className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`} className="block">
                <DocumentCard
                  doc={doc}
                  locale={locale as "ar" | "en"}
                  categories={catsMap}
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      {docs.length > 0 && (
        <Link
          href="/documents/new"
          className={`fixed bottom-6 end-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-rizq-green text-rizq-cream shadow-lg hover:bg-rizq-green-dark hover:scale-105 transition-all ${font}`}
          aria-label={isAr ? "رفع وثيقة" : "Upload document"}
        >
          <span className="text-2xl leading-none">+</span>
        </Link>
      )}
    </div>
  );
}
