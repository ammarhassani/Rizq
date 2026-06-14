/**
 * /[locale]/documents/[id] — Document detail. Phase-6 task P6.5.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteNav } from "@/components/nav/SiteNav";
import { DocumentDetailClient } from "@/components/documents/DocumentDetailClient";

type Params = { locale: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return { title: "وثيقة — رِزق" };
}

export default async function DocumentDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
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

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, title_ar, file_name, file_type, file_size, category, expiry_date, share_token, share_expires_at, tags, description_ar, created_at")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null)
    .single();

  if (error || !doc) notFound();

  const { data: catsRaw } = await supabase
    .from("document_categories")
    .select("id, name_ar, name_en")
    .eq("enabled", true)
    .order("sort_order");

  const categories = (catsRaw ?? []) as { id: string; name_ar: string; name_en: string }[];

  // Category label
  const catMeta = categories.find((c) => c.id === (doc.category as string | null));
  const catLabel = catMeta ? (isAr ? catMeta.name_ar : catMeta.name_en) : null;

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
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20"
        dir={dir}
      >
        <Link
          href="/documents"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "الوثائق" : "Documents"}
        </Link>

        <div className="mb-6">
          <h1 className={`text-2xl font-bold text-rizq-ink ${font}`}>{doc.title_ar as string}</h1>
          {catLabel && (
            <span className={`mt-2 inline-flex items-center rounded-full bg-rizq-green/8 text-rizq-green px-3 py-1 text-xs ${font}`}>
              {catLabel}
            </span>
          )}
          {doc.description_ar && (
            <p className={`mt-3 text-sm text-rizq-ink-soft ${font}`}>{doc.description_ar as string}</p>
          )}
        </div>

        <DocumentDetailClient
          doc={{
            id: doc.id as string,
            title_ar: doc.title_ar as string,
            file_name: doc.file_name as string,
            file_type: doc.file_type as string,
            file_size: doc.file_size as number,
            category: doc.category as string | null,
            expiry_date: doc.expiry_date as string | null,
            share_token: doc.share_token as string | null,
            share_expires_at: doc.share_expires_at as string | null,
            tags: (doc.tags as string[]) ?? [],
            description_ar: doc.description_ar as string | null,
            created_at: doc.created_at as string,
          }}
          locale={locale as "ar" | "en"}
          categories={categories}
        />
      </main>
    </div>
  );
}
