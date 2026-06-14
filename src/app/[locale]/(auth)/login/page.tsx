import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AuthCard } from "@/components/auth/AuthCard";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { LoginForm } from "@/components/auth/LoginForm";

// LoginForm uses useSearchParams (returnTo); skip static prerender.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.Login" });
  return { title: `${t("title")} · رِزق` };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Auth.Login" });
  const tShared = await getTranslations({ locale, namespace: "Auth.shared" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <AuthCard
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <span className={font}>
          {t("noAccount")}{" "}
          <Link
            href="/signup"
            className="text-rizq-green hover:text-rizq-green-dark underline-offset-4 hover:underline transition-colors"
          >
            {t("signupLink")}
          </Link>
        </span>
      }
    >
      <OAuthButtons locale={locale} />
      <AuthDivider locale={locale} label={tShared("or")} />
      <LoginForm locale={locale} />
    </AuthCard>
  );
}
