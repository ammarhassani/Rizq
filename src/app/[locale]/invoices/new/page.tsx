/**
 * /[locale]/invoices/new — Create new invoice. Phase-4 task P4.4.
 * Server component. Auth-gated. Reads ?gig= searchParam to pre-fill.
 * Mirrors income/new/page.tsx in structure.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { ContextualBackLink } from "@/components/nav/ContextualBackLink";
import { parseOrigin } from "@/lib/nav/origin";

type Params = { locale: string };
type SearchParams = { gig?: string; from?: string; guided?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Invoices.form" });
  return { title: `${t("addTitle")} · رِزق` };
}

export default async function InvoicesNewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const gigId = sp.gig;
  const origin = parseOrigin(sp);
  const guided = sp.guided === "1";

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

  // feature 007 — default the invoice currency to the freelancer's preferred currency.
  const { data: curRow } = await supabase
    .from("users")
    .select("rate_currency")
    .eq("id", userId)
    .maybeSingle();
  const defaultCurrency = (curRow?.rate_currency as string | null) ?? "SAR";

  // Fetch user's clients for the picker (RLS scopes to the owner)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const clientOptions = (clients ?? []).map((c: { id: string; name: string }) => ({
    id: c.id,
    name: c.name,
  }));

  // Fetch the catalog items + fee presets for the invoice builder pickers.
  const { data: catalog } = await supabase
    .from("items")
    .select("id, name, description, unit_price_sar, category")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const catalogItems = (catalog ?? []).map(
    (it: { id: string; name: string; description: string | null; unit_price_sar: number; category: string | null }) => ({
      id: it.id,
      name: it.name,
      description: it.description ?? null,
      unit_price_sar: Number(it.unit_price_sar),
      category: it.category ?? null,
    })
  );

  const { data: presets } = await supabase
    .from("fee_presets")
    .select("id, name, category, amount_sar, fee_type, percentage")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const feePresets = (presets ?? []).map(
    (p: { id: string; name: string; category: string | null; amount_sar: number; fee_type: string | null; percentage: number | null }) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? null,
      amount_sar: Number(p.amount_sar),
      fee_type: p.fee_type === "percentage" ? ("percentage" as const) : ("fixed" as const),
      percentage: p.percentage != null ? Number(p.percentage) : null,
    })
  );

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
        <ContextualBackLink
          locale={locale as "ar" | "en"}
          origin={origin}
          fallbackHref="/invoices"
          fallbackKey="invoices"
          guided={guided}
        />
        <InvoiceForm
          locale={locale as "ar" | "en"}
          clients={clientOptions}
          catalogItems={catalogItems}
          feePresets={feePresets}
          initial={gigPrefill}
          defaultCurrency={defaultCurrency}
        />
      </div>
    </AppShell>
  );
}
