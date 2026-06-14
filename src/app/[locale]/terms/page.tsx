import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LegalShell } from "@/components/legal/LegalShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Legal.Terms" });
  return { title: `${t("title")} · رِزق` };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Legal.Terms" });
  const tCommon = await getTranslations({ locale, namespace: "Legal" });
  const tFooter = await getTranslations({ locale, namespace: "Footer" });

  const sections = [
    { title: t("s1Title"), body: t("s1Body") },
    { title: t("s2Title"), body: t("s2Body") },
    { title: t("s3Title"), body: t("s3Body") },
    { title: t("s4Title"), body: t("s4Body") },
    { title: t("s5Title"), body: t("s5Body") },
    { title: t("s6Title"), body: t("s6Body") },
    { title: t("s7Title"), body: t("s7Body") },
    { title: t("s8Title"), body: t("s8Body") },
  ];

  return (
    <LegalShell
      locale={locale}
      title={t("title")}
      intro={t("intro")}
      sections={sections}
      contactLine={t("contact", { email: tFooter("contactEmail") })}
      lastUpdated={tCommon("lastUpdated")}
      backHomeLabel={tCommon("backHome")}
    />
  );
}
