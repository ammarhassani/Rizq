import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/components/landing/LocaleToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { VerifyBanner } from "@/components/auth/VerifyBanner";
import { Reveal } from "@/components/motion/Reveal";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, preferred_language")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.name || user.email?.split("@")[0] || "";
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const emailConfirmed =
    user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;

  return (
    <div className="relative min-h-screen flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />

      <header className="relative z-10 backdrop-blur-md bg-rizq-cream/70 border-b border-rizq-gold/15">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
          <Link href="/" className="group inline-flex items-baseline gap-2">
            <span className="font-arabic text-2xl font-bold text-rizq-green tracking-tight transition-colors group-hover:text-rizq-green-dark">
              رِزق
            </span>
            <span aria-hidden className="hidden sm:inline-block h-3 w-px bg-rizq-gold/50" />
            <span className="hidden sm:inline-block text-[10px] tracking-[0.24em] uppercase text-rizq-ink-soft/70">
              beta
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <LocaleToggle />
            <LogoutButton locale={locale} />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20">
        <Reveal asMount>
          <p className="eyebrow mb-4">v0.1 · sprint 2 · placeholder</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>
            {displayName
              ? t("welcome", { name: displayName })
              : t("welcomeGuest")}
          </h1>
          <p className={`mt-4 text-lg text-rizq-ink-soft max-w-xl ${font}`}>
            {t("comingSoon")}
          </p>
        </Reveal>

        {!emailConfirmed && user.email && (
          <Reveal asMount delay={0.15}>
            <div className="mt-12 max-w-3xl">
              <VerifyBanner locale={locale} email={user.email} />
            </div>
          </Reveal>
        )}

        <Reveal delay={0.25} asMount>
          <div className="mt-16 max-w-3xl border-t border-rizq-gold/15 pt-10">
            <p className={`text-sm text-rizq-ink-soft/80 ${font}`}>
              {locale === "ar"
                ? "ستظهر هنا أداة معيار التسعير في الإصدار التالي. شكرًا لانضمامك مبكرًا."
                : "The pricing benchmark tool will live here in the next release. Thanks for joining early."}
            </p>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
