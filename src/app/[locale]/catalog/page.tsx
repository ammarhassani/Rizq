/**
 * /[locale]/catalog — Products & Services + Tax & Fees management.
 *
 * Server component. Auth-gated. Fetches the owner's active catalog items and
 * fee presets (RLS scopes to the user) and hands them to CatalogManager, which
 * owns add / edit / archive. Mutations there router.refresh() back to here.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { CatalogManager } from "@/components/catalog/CatalogManager";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return { title: `${t("title")} · رِزق` };
}

export default async function CatalogPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Catalog" });

  // Active catalog items + fee presets (RLS scopes both to the owner).
  const { data: itemRows } = await supabase
    .from("items")
    .select("id, name, description, unit_price_sar, category")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const items = (itemRows ?? []).map(
    (it: { id: string; name: string; description: string | null; unit_price_sar: number; category: string | null }) => ({
      id: it.id,
      name: it.name,
      description: it.description ?? null,
      unit_price_sar: Number(it.unit_price_sar),
      category: it.category ?? null,
    })
  );

  const { data: presetRows } = await supabase
    .from("fee_presets")
    .select("id, name, category, amount_sar")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const feePresets = (presetRows ?? []).map(
    (p: { id: string; name: string; category: string | null; amount_sar: number }) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? null,
      amount_sar: Number(p.amount_sar),
    })
  );

  return (
    <AppShell locale={locale as "ar" | "en"} title={t("title")} maxWidth="wide">
      <CatalogManager locale={locale as "ar" | "en"} items={items} feePresets={feePresets} />
    </AppShell>
  );
}
