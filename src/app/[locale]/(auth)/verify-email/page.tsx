import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmailScreen } from "@/components/auth/VerifyEmailScreen";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { email } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Auth.Verify" });
  const tForgot = await getTranslations({ locale, namespace: "Auth.Forgot" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <AuthCard
      locale={locale}
      title={t("title")}
      footer={
        <Link
          href="/login"
          className={`inline-flex items-center gap-1 text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
        >
          <span className="inline-block rtl:rotate-180">←</span>
          {tForgot("backToLogin")}
        </Link>
      }
    >
      <VerifyEmailScreen
        locale={locale}
        email={email ?? "—"}
      />
    </AuthCard>
  );
}
