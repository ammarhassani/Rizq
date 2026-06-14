/**
 * /[locale]/invoices/new — Create new invoice. Phase-4 task P4.4.
 * Server component. Auth-gated. Reads ?gig= searchParam to pre-fill.
 * Mirrors income/new/page.tsx in structure.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

type Params = { locale: string };
type SearchParams = { gig?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Invoices.form" });
  return { title: `${t("addTitle")} — رِزق` };
}

export default async function InvoicesNewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const { gig: gigId } = await searchParams;

  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const isAr = locale === "ar";
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const userId = userData.user.id;

  // Fetch user's clients for the picker
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const clientOptions = (clients ?? []).map((c: { id: string; name: string }) => ({
    id: c.id,
    name: c.name,
  }));

  // Pre-fill from gig if ?gig= is present (owner-scoped)
  let gigPrefill: { title?: string; client_id?: string | null; amount_sar?: number; gig_id?: string } | undefined;

  if (gigId) {
    const { data: gig } = await supabase
      .from("gigs")
      .select("id, title, amount_sar, client_id")
      .eq("id", gigId)
      .eq("user_id", userId)
      .maybeSingle();

    if (gig) {
      gigPrefill = {
        title: gig.title as string,
        client_id: (gig.client_id as string | null) ?? null,
        amount_sar: Number(gig.amount_sar),
        gig_id: gig.id as string,
      };
    }
  }

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "فاتورة جديدة" : "New Invoice"} maxWidth="form">
      <div dir={isAr ? "rtl" : "ltr"}>
        <Link
          href="/invoices"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "الفواتير" : "Invoices"}
        </Link>
        <InvoiceForm
          locale={locale as "ar" | "en"}
          clients={clientOptions}
          initial={gigPrefill}
        />
      </div>
    </AppShell>
  );
}
