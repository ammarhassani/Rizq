/**
 * /[locale]/settings — Account settings + PDPL privacy surface.
 * Phase 6.11: data export, account deletion, privacy statement.
 * Server component. Auth-gated.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { resolveDisplayName } from "@/lib/profile/displayName";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { AccountIntegrations } from "@/components/settings/AccountIntegrations";
import { listProviderConnections } from "@/app/actions/projects/integrations/connect";
import { isGithubConfigured } from "@/lib/integrations/github";
import { loadProfileSnapshot } from "@/lib/profile/snapshot";
import { computeStrength } from "@/lib/profile/strength";
import { User, Crown, Calendar, ArrowLeft } from "lucide-react";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: `${t("pageTitle")} · رِزق` };
}

function formatDate(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function SettingsPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Settings" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, name, full_name_ar, role, created_at")
    .eq("id", userData.user.id)
    .single();

  const role = (profile?.role ?? "free") as string;
  const memberSince = formatDate(profile?.created_at ?? null, locale as "ar" | "en");

  // Profile strength for the summary (same model as onboarding + the profile page).
  const { snapshot: profileSnapshot } = await loadProfileSnapshot(supabase, userData.user.id);
  const profileStrength = computeStrength(profileSnapshot);
  const confirmPhrase = t("delete");

  // Tier display
  const tierLabel =
    role === "admin"
      ? t("tierAdmin")
      : role === "pro"
      ? t("tierPro")
      : t("tierFree");

  return (
    <AppShell locale={locale as "ar" | "en"} title={t("pageTitle")} maxWidth="form">
      <div dir={dir}>
        {/* Back link */}
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink mb-8 transition-colors ${font}`}
        >
          <ArrowLeft size={14} strokeWidth={1.8} className={isAr ? "rotate-180" : ""} />
          <span>{t("backToDashboard")}</span>
        </Link>

        {/* Page header */}
        <div className="mb-10">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("pageTitle")}</h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>
            {t("pageSubtitle")}
          </p>
        </div>

        {/* ── Profile summary ─────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className={`text-base font-semibold text-rizq-ink mb-4 ${font}`}>
            {t("profileSectionTitle")}
          </h2>

          <div className="card-wahaj p-6">
            <div className="flex items-start gap-4">
              {/* Avatar placeholder */}
              <div className="h-12 w-12 rounded-2xl bg-rizq-green/10 border border-rizq-green/20 flex items-center justify-center shrink-0">
                <User size={20} strokeWidth={1.6} className="text-rizq-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base font-semibold text-rizq-ink truncate ${font}`}>
                  {resolveDisplayName(
                    profile?.full_name_ar as string | null,
                    profile?.name as string | null,
                    userData.user.email
                  ) ?? "—"}
                </p>
                <p className={`text-sm text-rizq-ink-soft truncate mt-0.5 ${font}`}>
                  {profile?.email ?? userData.user.email ?? "—"}
                </p>
              </div>
            </div>

            {/* Profile details grid */}
            <div
              className={`mt-5 pt-5 border-t border-rizq-gold/20 grid grid-cols-2 gap-4 ${font}`}
            >
              {/* Tier */}
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("profileTierLabel")}</p>
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    role === "free" ? "text-rizq-ink-soft" : "text-rizq-green"
                  }`}
                >
                  {role !== "free" && (
                    <Crown size={13} strokeWidth={1.8} className="text-rizq-gold" />
                  )}
                  {tierLabel}
                </span>
              </div>

              {/* Member since */}
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">
                  {t("profileMemberSinceLabel")}
                </p>
                <span className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft ${font}`}>
                  <Calendar size={13} strokeWidth={1.8} />
                  {memberSince}
                </span>
              </div>
            </div>

            {/* Profile strength */}
            <div className={`mt-5 pt-5 border-t border-rizq-gold/20 ${font}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className={`text-xs text-rizq-ink-soft/70 ${font}`}>
                  {t("profileStrength")}
                </span>
                <span className="tabular font-sans text-sm font-bold text-rizq-green">
                  {profileStrength}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-rizq-gold/15">
                <div
                  className="h-full rounded-full bg-rizq-green transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${Math.max(0, Math.min(100, profileStrength))}%` }}
                />
              </div>
            </div>

            {/* Edit / upgrade links */}
            <div
              className={`mt-4 pt-4 border-t border-rizq-gold/20 flex flex-wrap gap-3 ${font}`}
            >
              <Link
                href="/settings/profile"
                className={`text-sm text-rizq-green hover:underline ${font}`}
              >
                {t("completeProfile")}
              </Link>
              {role === "free" && (
                <Link
                  href="/upgrade"
                  className={`text-sm text-rizq-gold hover:underline ${font}`}
                >
                  {t("upgradeLink")}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Integrations (account-level) ────────────────────────────── */}
        <AccountIntegrations
          locale={locale as "ar" | "en"}
          githubConfigured={isGithubConfigured()}
          connections={await listProviderConnections()}
        />

        {/* ── PDPL: Privacy & data + Danger zone ─────────────────────── */}
        <div className="card-wahaj p-6 sm:p-8">
          <SettingsClient locale={locale as "ar" | "en"} confirmPhrase={confirmPhrase} />
        </div>
      </div>
    </AppShell>
  );
}
