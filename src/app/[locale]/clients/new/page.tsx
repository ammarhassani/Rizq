/**
 * /[locale]/clients/new — Add new client. Phase-3 task 3.2.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ClientForm } from "@/components/clients/ClientForm";
import { ContextualBackLink } from "@/components/nav/ContextualBackLink";
import { parseOrigin } from "@/lib/nav/origin";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Clients.form" });
  return { title: `${t("addTitle")} · رِزق` };
}

export default async function ClientNewPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ from?: string; guided?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
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

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "عميل جديد" : "New Client"} maxWidth="form">
      <div dir={isAr ? "rtl" : "ltr"}>
        <ContextualBackLink
          locale={locale as "ar" | "en"}
          origin={origin}
          fallbackHref="/clients"
          fallbackKey="clients"
          guided={guided}
        />
        <ClientForm locale={locale as "ar" | "en"} mode="create" />
      </div>
    </AppShell>
  );
}
