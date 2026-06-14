/**
 * /[locale]/income/new — Log new gig. Phase-3 task 3.7.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { GigForm } from "@/components/income/GigForm";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Income.form" });
  return { title: `${t("addTitle")} · رِزق` };
}

export default async function IncomeNewPage({ params }: { params: Promise<Params> }) {
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
  const font = locale === "ar" ? "font-arabic" : "font-sans";

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

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "سجّل مشروع" : "Log a Gig"} maxWidth="form">
      <div dir={isAr ? "rtl" : "ltr"}>
        <Link
          href="/income"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "دفتر الدخل" : "Income Ledger"}
        </Link>
        <GigForm locale={locale as "ar" | "en"} mode="create" clients={clientOptions} />
      </div>
    </AppShell>
  );
}
