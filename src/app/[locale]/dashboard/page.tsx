import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { SiteNav } from "@/components/nav/SiteNav";
import { VerifyBanner } from "@/components/auth/VerifyBanner";
import { QuotaBadge } from "@/components/tool/QuotaBadge";
import { getQuotaState } from "@/lib/pricing/quota";
import { Reveal } from "@/components/motion/Reveal";
import { ArrowRight, Globe, History, HandCoins, ShieldCheck } from "lucide-react";

type HistoryRow = {
  id: string;
  result_median: number | null;
  result_sample_size: number | null;
  public_share: boolean;
  created_at: string;
  specialty: { name_ar: string; name_en: string; slug: string } | null;
  city: { name_ar: string; name_en: string; slug: string } | null;
  experience_tier: { name_ar: string; name_en: string; slug: string } | null;
};

type SubmissionRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "needs_info";
  price_sar: string | number;
  submitted_at: string;
  specialty: { name_ar: string; name_en: string; slug: string } | null;
  city: { name_ar: string; name_en: string; slug: string } | null;
};

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

  const [profileRes, quota, historyRes, submissionsRes] = await Promise.all([
    supabase
      .from("users")
      .select("name, email, preferred_language, role, bonus_quota")
      .eq("id", user.id)
      .single(),
    getQuotaState(),
    supabase
      .from("queries")
      .select(`
        id, result_median, result_sample_size, public_share, created_at,
        specialty:specialties (slug, name_ar, name_en),
        city:cities (slug, name_ar, name_en),
        experience_tier:experience_tiers (slug, name_ar, name_en)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("pricing_submissions")
      .select(`
        id, status, price_sar, submitted_at,
        specialty:specialties (slug, name_ar, name_en),
        city:cities (slug, name_ar, name_en)
      `)
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const history = (historyRes.data ?? []) as unknown as HistoryRow[];
  const submissions = (submissionsRes.data ?? []) as unknown as SubmissionRow[];
  const isAdmin = profile?.role === "admin";

  const displayName = profile?.name || user.email?.split("@")[0] || "";
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tTool = await getTranslations({ locale, namespace: "Tool" });
  const tContribute = await getTranslations({ locale, namespace: "ContributeCTA" });
  const tMySubs = await getTranslations({ locale, namespace: "MySubmissions" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const emailConfirmed =
    user.email_confirmed_at !== null && user.email_confirmed_at !== undefined;

  const mode = (quota.ok ? quota.mode : "free") as
    | "anon"
    | "free"
    | "pro"
    | "admin";
  const remaining = quota.ok ? quota.remaining : 0;
  const limit = 3 + (profile?.bonus_quota ?? 0);
  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });
  const dateFmt = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA" : "en-US",
    { day: "numeric", month: "short" }
  );

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

      <SiteNav locale={locale} />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20">
        <Reveal asMount>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div>
              <p className="eyebrow mb-4">
                {locale === "ar" ? "حسابك" : "Your account"}
              </p>
              <h1 className={`display-2 text-rizq-ink ${font}`}>
                {displayName
                  ? t("welcome", { name: displayName })
                  : t("welcomeGuest")}
              </h1>
            </div>
            <div className="shrink-0 pt-2">
              <QuotaBadge
                locale={locale}
                mode={mode}
                remaining={remaining}
                limit={limit}
              />
            </div>
          </div>
        </Reveal>

        {!emailConfirmed && user.email && (
          <Reveal asMount delay={0.12}>
            <div className="mt-10 max-w-3xl">
              <VerifyBanner locale={locale} email={user.email} />
            </div>
          </Reveal>
        )}

        {/* Primary CTA — Open the tool */}
        <Reveal asMount delay={0.2}>
          <div className="mt-12 sm:mt-16 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <Link
              href="/tool"
              className="group lg:col-span-2 block relative overflow-hidden rounded-3xl border border-rizq-green/25 bg-gradient-to-br from-rizq-green/8 via-rizq-cream to-rizq-gold/8 px-7 py-8 sm:px-10 sm:py-10 hover:border-rizq-green/45 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <p className="eyebrow mb-3">{tTool("eyebrow")}</p>
                  <h2 className={`text-2xl sm:text-3xl font-semibold text-rizq-ink leading-snug ${font}`}>
                    {tTool("title")}
                  </h2>
                  <p className={`mt-2 text-sm sm:text-base text-rizq-ink-soft ${font}`}>
                    {t("openTool")}
                  </p>
                </div>
                <span className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-rizq-green text-rizq-cream shrink-0 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                  <ArrowRight size={22} strokeWidth={1.8} className="rtl:rotate-180" />
                </span>
              </div>
            </Link>

            {/* Secondary CTA — Contribute data */}
            <Link
              href="/submit"
              className="group block rounded-3xl border border-rizq-gold/25 bg-rizq-cream/70 px-6 py-7 hover:border-rizq-gold-dark/40 hover:-translate-y-0.5 transition-all"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rizq-gold/30 bg-rizq-cream text-rizq-gold-dark mb-4">
                <HandCoins size={18} strokeWidth={1.6} />
              </span>
              <h3 className={`text-lg font-semibold text-rizq-ink mb-2 ${font}`}>
                {tContribute("title")}
              </h3>
              <p className={`text-sm text-rizq-ink-soft mb-4 leading-relaxed ${font}`}>
                {tContribute("subtitle")}
              </p>
              <span className={`inline-flex items-center gap-2 text-sm text-rizq-green font-medium ${font}`}>
                <span>{tContribute("cta")}</span>
                <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                  →
                </span>
              </span>
            </Link>
          </div>
        </Reveal>

        {/* Admin link — visible only to admins */}
        {isAdmin && (
          <Reveal asMount delay={0.28}>
            <div className="mt-6">
              <Link
                href="/admin"
                className={`inline-flex items-center gap-2 text-sm text-rizq-gold-dark hover:text-rizq-green transition-colors ${font}`}
              >
                <ShieldCheck size={14} strokeWidth={1.8} />
                <span>{locale === "ar" ? "لوحة المراجع" : "Review panel"}</span>
                <span className="inline-block rtl:rotate-180">→</span>
              </Link>
            </div>
          </Reveal>
        )}

        {/* Query history */}
        <Reveal asMount delay={0.32}>
          <section className="mt-16 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <History size={16} className="text-rizq-gold-dark" strokeWidth={1.6} />
              <h2 className={`text-lg font-semibold text-rizq-ink ${font}`}>
                {t("historyHeading")}
              </h2>
            </div>

            {history.length === 0 ? (
              <p className={`text-sm text-rizq-ink-soft/70 ${font}`}>
                {t("historyEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-rizq-gold/15 border-y border-rizq-gold/15">
                {history.map((row) => {
                  const sName = row.specialty
                    ? row.specialty[locale === "ar" ? "name_ar" : "name_en"]
                    : "—";
                  const cName = row.city
                    ? row.city[locale === "ar" ? "name_ar" : "name_en"]
                    : "—";
                  const tName = row.experience_tier
                    ? row.experience_tier[locale === "ar" ? "name_ar" : "name_en"]
                    : "—";
                  const median = row.result_median !== null
                    ? Math.round(Number(row.result_median))
                    : null;

                  // Prefill URL: /tool?specialty=...&city=...&tier=...
                  const rerunParams = new URLSearchParams();
                  if (row.specialty) rerunParams.set("specialty", row.specialty.slug);
                  if (row.city) rerunParams.set("city", row.city.slug);
                  if (row.experience_tier)
                    rerunParams.set("tier", row.experience_tier.slug);
                  const rerunHref = `/tool?${rerunParams.toString()}`;

                  return (
                    <li
                      key={row.id}
                      className="group py-4 sm:py-5 flex items-center justify-between gap-4 hover:bg-rizq-gold/[0.04] -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <Link
                        href={rerunHref}
                        className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 rounded-md"
                      >
                        <p className={`text-sm sm:text-base font-medium text-rizq-ink ${font} truncate`}>
                          {sName}{" "}
                          <span className="text-rizq-ink-soft/70">·</span>{" "}
                          {cName}{" "}
                          <span className="text-rizq-ink-soft/70">·</span>{" "}
                          {tName}
                        </p>
                        <p className={`mt-1 text-xs text-rizq-ink-soft ${font}`}>
                          {dateFmt.format(new Date(row.created_at))}
                          {row.public_share && (
                            <span className="ms-3 inline-flex items-center gap-1 text-rizq-green">
                              <Globe size={11} strokeWidth={2} />
                              {t("historyShare")}
                            </span>
                          )}
                        </p>
                      </Link>
                      <div className="flex items-center gap-4 shrink-0">
                        {median !== null && (
                          <span className="hidden sm:flex flex-col items-end">
                            <span className="font-sans tabular text-lg font-medium text-rizq-green leading-none">
                              {fmt.format(median)}
                            </span>
                            <span className={`text-[10px] tracking-wider uppercase text-rizq-ink-soft/60 mt-0.5 ${font}`}>
                              {tTool("result.currency")}
                            </span>
                          </span>
                        )}
                        <Link
                          href={rerunHref}
                          className={`text-xs text-rizq-green hover:text-rizq-green-dark transition-colors opacity-70 group-hover:opacity-100 ${font}`}
                        >
                          {t("historyRerun")}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Reveal>

        {/* My submissions */}
        <Reveal asMount delay={0.4}>
          <section className="mt-16 max-w-4xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <HandCoins size={16} className="text-rizq-gold-dark" strokeWidth={1.6} />
                <h2 className={`text-lg font-semibold text-rizq-ink ${font}`}>
                  {tMySubs("heading")}
                </h2>
              </div>
              <Link
                href="/submit"
                className={`text-xs text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
              >
                {tContribute("cta")} →
              </Link>
            </div>

            {submissions.length === 0 ? (
              <p className={`text-sm text-rizq-ink-soft/70 ${font}`}>
                {tMySubs("empty")}
              </p>
            ) : (
              <ul className="divide-y divide-rizq-gold/15 border-y border-rizq-gold/15">
                {submissions.map((s) => {
                  const sName = s.specialty
                    ? s.specialty[locale === "ar" ? "name_ar" : "name_en"]
                    : "—";
                  const cName = s.city
                    ? s.city[locale === "ar" ? "name_ar" : "name_en"]
                    : "—";
                  const statusKey = s.status as
                    | "pending"
                    | "approved"
                    | "rejected"
                    | "needs_info";
                  const statusTone =
                    statusKey === "approved"
                      ? "text-rizq-green"
                      : statusKey === "rejected"
                        ? "text-red-700"
                        : statusKey === "needs_info"
                          ? "text-amber-700"
                          : "text-rizq-ink-soft";
                  return (
                    <li
                      key={s.id}
                      className="py-4 sm:py-5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm sm:text-base font-medium text-rizq-ink ${font} truncate`}>
                          {sName}{" "}
                          <span className="text-rizq-ink-soft/70">·</span>{" "}
                          {cName}
                        </p>
                        <p className={`mt-1 text-xs text-rizq-ink-soft ${font}`}>
                          {dateFmt.format(new Date(s.submitted_at))}
                          <span className={`ms-3 ${statusTone}`}>
                            {tMySubs(`status.${statusKey}`)}
                          </span>
                        </p>
                      </div>
                      <span className="hidden sm:inline-flex flex-col items-end shrink-0">
                        <span className="font-sans tabular text-lg font-medium text-rizq-ink leading-none">
                          {fmt.format(Number(s.price_sar))}
                        </span>
                        <span className={`text-[10px] tracking-wider uppercase text-rizq-ink-soft/60 mt-0.5 ${font}`}>
                          {tTool("result.currency")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Reveal>
      </main>
    </div>
  );
}
