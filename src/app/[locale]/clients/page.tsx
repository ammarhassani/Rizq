/**
 * /[locale]/clients — Client Book list page. Phase-3 task 3.2.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ClientListClient } from "@/components/clients/ClientListClient";
import type { ClientRow } from "@/components/clients/ClientCard";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Clients.list" });
  return { title: `${t("title")} · رِزق` };
}

export default async function ClientsListPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Clients.list" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";

  // Fetch active clients ordered: priority high→low, then last_contacted_at asc nulls first
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, name_en, company, client_type, last_contacted_at, total_gigs, total_value_sar, rating, follow_up_priority, tags, is_active")
    .eq("is_active", true)
    .order("follow_up_priority", { ascending: false })
    .order("last_contacted_at", { ascending: true, nullsFirst: true });

  const rows = (clients ?? []) as ClientRow[];

  return (
    <AppShell locale={locale as "ar" | "en"} title={t("eyebrow")} maxWidth="wide">
      <div dir={isAr ? "rtl" : "ltr"}>
        <div className="mb-6 sm:mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{t("eyebrow")}</p>
            <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
            <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>{t("subtitle")}</p>
          </div>
          <Link
            href="/clients/new"
            className={`shrink-0 inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
          >
            {t("add")}
          </Link>
        </div>
        {rows.length === 0 ? (
          <div dir={isAr ? "rtl" : "ltr"} className={`card-wahaj p-10 text-center ${font}`}>
            <div aria-hidden className="mx-auto mb-6 h-16 w-16 rounded-2xl border-2 border-rizq-gold/30 bg-rizq-green/8 flex items-center justify-center">
              <span className="font-arabic text-2xl font-bold text-rizq-green leading-none">د</span>
            </div>
            <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>{t("emptyTitle")}</h2>
            <p className={`text-sm text-rizq-ink-soft mb-6 max-w-sm mx-auto ${font}`}>{t("emptyBody")}</p>
            <Link
              href="/clients/new"
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
            >
              {t("emptyCta")}
              <span className="inline-block rtl:rotate-180">→</span>
            </Link>
          </div>
        ) : (
          <ClientListClient clients={rows} locale={locale as "ar" | "en"} />
        )}
      </div>
    </AppShell>
  );
}
