import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Auth.Forgot" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <AuthCard
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <Link
          href="/login"
          className={`inline-flex items-center gap-1 text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
        >
          <span className="inline-block rtl:rotate-180">←</span>
          {t("backToLogin")}
        </Link>
      }
    >
      <ForgotPasswordForm locale={locale} />
    </AuthCard>
  );
}
