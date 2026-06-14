/**
 * /[locale]/dashboard — M0 Dashboard home. Phase-5 tasks P5.2 + P5.3.
 * Server component. Auth-gated. Loads widget data in parallel.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { getUpcomingInvoiceDueDates } from "@/lib/invoices/queries";
import { resolvePrice } from "@/lib/pricing/resolve";
import { InsightsWidget } from "@/components/dashboard/InsightsWidget";
import { RecentProposalsWidget } from "@/components/dashboard/RecentProposalsWidget";
import { UpcomingDeadlinesWidget } from "@/components/dashboard/UpcomingDeadlinesWidget";
import { ActiveClientsWidget } from "@/components/dashboard/ActiveClientsWidget";
import { MonthlyIncomeWidget } from "@/components/dashboard/MonthlyIncomeWidget";
import { QuickPricingWidget } from "@/components/dashboard/QuickPricingWidget";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import type { UpcomingInvoice } from "@/lib/invoices/queries";

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: `${t("dashboardTitle")} · رِزق` };
}

export default async function DashboardPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const userId = userData.user.id;
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch user profile: name + onboarding specialty/city/tier IDs (M8 columns).
  // NOTE: users has no *_slug columns — quick pricing resolves slugs from the
  // ref tables below using these FK ids.
  const { data: profile } = await supabase
    .from("users")
    .select("name, full_name_ar, primary_specialty_id, city_id, experience_tier_id")
    .eq("id", userId)
    .maybeSingle();

  const userName =
    (profile?.full_name_ar as string | null) ??
    (profile?.name as string | null) ??
    userData.user.email?.split("@")[0] ??
    null;

  // --- Parallel data fetches, each wrapped in try/catch ---
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Proposals (last 30d, last 5). proposals has no title/final_price_sar columns —
  // use client_name (typed) as the label and price_anchor as the amount.
  type ProposalRow = {
    id: string;
    client_name: string | null;
    status: string;
    price_anchor: number | null;
    created_at: string | null;
    clients: { name: string } | null;
  };
  let proposals: ProposalRow[] = [];
  {
    const { data, error } = await supabase
      .from("proposals")
      .select("id, client_name, status, price_anchor, created_at, clients(name)")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) console.error("[dashboard] proposals query failed", error.message);
    proposals = (data ?? []) as unknown as ProposalRow[];
  }

  // Upcoming invoice deadlines (next 7 items)
  let invoiceDeadlines: UpcomingInvoice[] = [];
  try {
    invoiceDeadlines = await getUpcomingInvoiceDueDates(supabase, userId, { limit: 7 });
  } catch { /* widget shows error state */ }

  // Clients
  type ClientRow = {
    id: string;
    name: string;
    total_gigs: number | null;
    total_value_sar: number | null;
    last_contacted_at: string | null;
  };
  let clients: ClientRow[] = [];
  try {
    const { data } = await supabase
      .from("clients")
      .select("id, name, total_gigs, total_value_sar, last_contacted_at")
      .eq("user_id", userId)
      .order("last_contacted_at", { ascending: false })
      .limit(10);
    clients = (data ?? []) as ClientRow[];
  } catch { /* widget shows error state */ }

  // Monthly income (current + previous month)
  type MonthlyRow = {
    month: string | null;
    total_sar: number | null;
    paid_sar: number | null;
    pending_sar: number | null;
  };
  let currentMonth: MonthlyRow | null = null;
  let prevMonth: MonthlyRow | null = null;
  try {
    const { data } = await supabase
      .from("monthly_income")
      .select("month, total_sar, paid_sar, pending_sar")
      .gte("month", prevMonthStart)
      .lte("month", prevMonthEnd)
      .order("month", { ascending: false })
      .limit(2);
    const rows = (data ?? []) as MonthlyRow[];
    currentMonth = rows.find((r) => {
      if (!r.month) return false;
      const d = new Date(r.month);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }) ?? null;
    prevMonth = rows.find((r) => {
      if (!r.month) return false;
      const d = new Date(r.month);
      const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === p.getFullYear() && d.getMonth() === p.getMonth();
    }) ?? null;
  } catch { /* widget shows 0 state */ }

  // Quick pricing — resolve slugs from the user's onboarding FK ids (if set),
  // then call resolvePrice. Most users haven't set these yet → widget shows CTA.
  let quickPricingAnchor: number | null = null;
  let quickPricingSpecialty: string | null = null;
  const specialtyId = (profile?.primary_specialty_id as string | null) ?? null;
  const cityId = (profile?.city_id as string | null) ?? null;
  const tierId = (profile?.experience_tier_id as string | null) ?? null;
  if (specialtyId && cityId && tierId) {
    try {
      const [specRes, cityRes, tierRes] = await Promise.all([
        supabase.from("specialties").select("slug, name_ar, name_en").eq("id", specialtyId).maybeSingle(),
        supabase.from("cities").select("slug").eq("id", cityId).maybeSingle(),
        supabase.from("experience_tiers").select("slug").eq("id", tierId).maybeSingle(),
      ]);
      const sSlug = specRes.data?.slug as string | undefined;
      const cSlug = cityRes.data?.slug as string | undefined;
      const tSlug = tierRes.data?.slug as string | undefined;
      if (sSlug && cSlug && tSlug) {
        const res = await resolvePrice({
          specialty_slug: sSlug,
          city_slug: cSlug,
          experience_tier_slug: tSlug,
        });
        if (res.status === "ok") {
          quickPricingAnchor = res.anchor;
          quickPricingSpecialty =
            (isAr ? (specRes.data?.name_ar as string | null) : (specRes.data?.name_en as string | null)) ?? sSlug;
        }
      }
    } catch { /* skip gracefully */ }
  }

  const t2 = await getTranslations({ locale, namespace: "AppShell" });
  const shellTitle = isAr ? t2("apps.dashboard.name") : t2("apps.dashboard.name");

  return (
    <AppShell locale={locale as "ar" | "en"} title={shellTitle} maxWidth="wide">
      <div dir={dir}>
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <p className="eyebrow mb-3">{isAr ? "لوحة التحكم" : "Dashboard"}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>
            {userName
              ? (isAr ? `أهلًا، ${userName}` : `Welcome, ${userName}`)
              : (isAr ? "أهلًا بك في رِزق" : "Welcome to Rizq")}
          </h1>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* InsightsWidget: full-width hero, client island */}
          <div className="col-span-full">
            <InsightsWidget locale={locale as "ar" | "en"} />
          </div>

          {/* Recent Proposals */}
          <RecentProposalsWidget
            proposals={proposals.map((p) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const linked = ((p.clients as any)?.name as string | null) ?? null;
              return {
                id: p.id,
                title: p.client_name ?? linked,
                client_name: linked,
                status: p.status,
                final_price_sar: p.price_anchor,
                created_at: p.created_at,
              };
            })}
            locale={locale as "ar" | "en"}
          />

          {/* Upcoming Deadlines */}
          <UpcomingDeadlinesWidget
            invoices={invoiceDeadlines}
            locale={locale as "ar" | "en"}
          />

          {/* Active Clients */}
          <ActiveClientsWidget
            clients={clients}
            locale={locale as "ar" | "en"}
          />

          {/* Monthly Income */}
          <MonthlyIncomeWidget
            current={currentMonth}
            previous={prevMonth}
            locale={locale as "ar" | "en"}
          />

          {/* Quick Pricing */}
          <QuickPricingWidget
            anchor={quickPricingAnchor}
            specialty={quickPricingSpecialty}
            locale={locale as "ar" | "en"}
          />

          {/* Quick Actions — full width */}
          <div className="col-span-full">
            <QuickActionsWidget locale={locale as "ar" | "en"} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

