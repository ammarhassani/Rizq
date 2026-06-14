import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { SiteNav } from "@/components/nav/SiteNav";
import { ReviewActions } from "@/components/admin/ReviewActions";

type Status = "pending" | "approved" | "rejected" | "needs_info";

type Submission = {
  id: string;
  status: Status;
  price_sar: string | number;
  project_type: string | null;
  project_size: string | null;
  project_duration_days: number | null;
  client_type: string | null;
  notes: string | null;
  proof_url: string | null;
  moderator_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  user_id: string;
  submitter_email: string | null;
  specialty: { slug: string; name_ar: string; name_en: string } | null;
  city: { slug: string; name_ar: string; name_en: string } | null;
  experience_tier: { slug: string; name_ar: string; name_en: string } | null;
};

const STATUSES: Status[] = ["pending", "approved", "rejected", "needs_info"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("title")} · رِزق` };
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: rawStatus } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?returnTo=/${locale}/admin`);

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    const t = await getTranslations({ locale, namespace: "Admin" });
    const tNav = await getTranslations({ locale, namespace: "Nav" });
    const font = locale === "ar" ? "font-arabic" : "font-sans";
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav locale={locale as "ar" | "en"} />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className={`display-2 text-rizq-ink mb-3 ${font}`}>
              {t("notAdmin")}
            </p>
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
            >
              <span className="inline-block rtl:rotate-180">←</span>
              <span>{tNav("dashboard")}</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const status: Status =
    rawStatus && (STATUSES as string[]).includes(rawStatus)
      ? (rawStatus as Status)
      : "pending";

  const { data: rawSubmissions } = await supabase
    .from("pricing_submissions")
    .select(
      `
      id, status, price_sar, project_type, project_size, project_duration_days,
      client_type, notes, proof_url, moderator_notes, submitted_at, reviewed_at,
      user_id,
      specialty:specialties (slug, name_ar, name_en),
      city:cities (slug, name_ar, name_en),
      experience_tier:experience_tiers (slug, name_ar, name_en)
    `
    )
    .eq("status", status)
    .order("submitted_at", { ascending: false })
    .limit(50);

  const submissions = (rawSubmissions ?? []) as unknown as Submission[];

  // Pull submitter emails (admin can read public.users via RLS? — let's check)
  // Simplest: just don't show email for now since RLS on users only allows self-read.
  // We'd need to extend the policy. Skip for v0.1; show user_id snippet instead.

  // Generate signed URLs for proofs (admin can read via storage RLS)
  const proofSignedUrls = new Map<string, string>();
  for (const s of submissions) {
    if (s.proof_url) {
      const { data: signed } = await supabase.storage
        .from("submission-proofs")
        .createSignedUrl(s.proof_url, 60 * 10); // 10 min
      if (signed?.signedUrl) proofSignedUrls.set(s.id, signed.signedUrl);
    }
  }

  const t = await getTranslations({ locale, namespace: "Admin" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dateFmt = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-SA" : "en-US",
    { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }
  );
  const priceFmt = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav locale={locale as "ar" | "en"} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12 py-10 sm:py-14">
        <p className="eyebrow mb-3">{t("eyebrow")}</p>
        <h1 className={`display-2 text-rizq-ink mb-4 ${font}`}>{t("title")}</h1>
        <p className={`text-base text-rizq-ink-soft mb-10 max-w-2xl ${font}`}>
          {t("subtitle")}
        </p>

        {/* Status tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={s === "pending" ? "/admin" : `/admin?status=${s}`}
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-xs sm:text-sm transition-colors ${
                s === status
                  ? "border-rizq-green/40 bg-rizq-green/10 text-rizq-green"
                  : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/30"
              } ${font}`}
            >
              {t(
                s === "pending"
                  ? "tabPending"
                  : s === "approved"
                    ? "tabApproved"
                    : s === "rejected"
                      ? "tabRejected"
                      : "tabNeedsInfo"
              )}
            </Link>
          ))}
        </div>

        {/* Queue */}
        {submissions.length === 0 ? (
          <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("empty")}</p>
        ) : (
          <ul className="space-y-4">
            {submissions.map((s) => {
              const sName = s.specialty
                ? s.specialty[locale === "ar" ? "name_ar" : "name_en"]
                : "—";
              const cName = s.city
                ? s.city[locale === "ar" ? "name_ar" : "name_en"]
                : "—";
              const tName = s.experience_tier
                ? s.experience_tier[locale === "ar" ? "name_ar" : "name_en"]
                : "—";
              const signedUrl = proofSignedUrls.get(s.id);

              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-rizq-gold/20 bg-rizq-cream/70 p-5 sm:p-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                    {/* Submission details */}
                    <div className="lg:col-span-7 min-w-0">
                      <div className="flex items-baseline justify-between gap-4 mb-3">
                        <h2 className={`text-lg font-semibold text-rizq-ink truncate ${font}`}>
                          {sName} · {cName} · {tName}
                        </h2>
                        <span className="font-sans tabular text-xl font-medium text-rizq-green shrink-0">
                          {priceFmt.format(Number(s.price_sar))}{" "}
                          <span className="text-xs text-rizq-ink-soft/60">SAR</span>
                        </span>
                      </div>

                      <dl className={`grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-rizq-ink-soft ${font}`}>
                        {s.project_type && (
                          <div className="col-span-2">
                            <dt className="text-rizq-ink-soft/60">{t("fields.specialty")}</dt>
                            <dd className="text-rizq-ink">{s.project_type}</dd>
                          </div>
                        )}
                        {s.project_size && (
                          <div>
                            <dt className="text-rizq-ink-soft/60">{t("fields.size")}</dt>
                            <dd className="text-rizq-ink">{s.project_size}</dd>
                          </div>
                        )}
                        {s.client_type && (
                          <div>
                            <dt className="text-rizq-ink-soft/60">{t("fields.clientType")}</dt>
                            <dd className="text-rizq-ink">{s.client_type}</dd>
                          </div>
                        )}
                        {s.project_duration_days !== null && (
                          <div>
                            <dt className="text-rizq-ink-soft/60">{t("fields.duration")}</dt>
                            <dd className="text-rizq-ink">{s.project_duration_days}d</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-rizq-ink-soft/60">{t("fields.submittedAt")}</dt>
                          <dd className="text-rizq-ink">
                            {dateFmt.format(new Date(s.submitted_at))}
                          </dd>
                        </div>
                      </dl>

                      {s.notes && (
                        <p className={`mt-3 text-sm text-rizq-ink-soft leading-relaxed ${font} bg-rizq-cream-dark/40 rounded-lg px-3 py-2`}>
                          {s.notes}
                        </p>
                      )}

                      <p className={`mt-3 text-xs ${font}`}>
                        {signedUrl ? (
                          <a
                            href={signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rizq-green hover:text-rizq-green-dark underline-offset-4 hover:underline"
                          >
                            {t("viewProof")} →
                          </a>
                        ) : (
                          <span className="text-rizq-ink-soft/60">{t("noProof")}</span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-5 lg:border-s lg:border-rizq-gold/15 lg:ps-6">
                      {status === "pending" ? (
                        <ReviewActions
                          locale={locale as "ar" | "en"}
                          submissionId={s.id}
                        />
                      ) : (
                        <div className="space-y-2">
                          <p className={`text-xs uppercase tracking-wider text-rizq-ink-soft/60 ${font}`}>
                            {s.status}
                          </p>
                          {s.moderator_notes && (
                            <p className={`text-sm text-rizq-ink-soft italic ${font}`}>
                              "{s.moderator_notes}"
                            </p>
                          )}
                          {s.reviewed_at && (
                            <p className={`text-xs text-rizq-ink-soft/60 ${font}`}>
                              {dateFmt.format(new Date(s.reviewed_at))}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
