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
import { SiteNav } from "@/components/nav/SiteNav";
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
  return { title: `${t("dashboardTitle")} — رِزق` };
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

  // Fetch user profile for name + specialty/city
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, specialty_slug, city_slug, experience_tier_slug")
    .eq("id", userId)
    .maybeSingle();

  const userName = (profile?.full_name as string | null) ?? userData.user.email?.split("@")[0] ?? null;

  // --- Parallel data fetches, each wrapped in try/catch ---
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Proposals (last 30d, last 5)
  type ProposalRow = {
    id: string;
    title: string | null;
    status: string;
    final_price_sar: number | null;
    created_at: string | null;
    clients: { name: string } | null;
  };
  let proposals: ProposalRow[] = [];
  try {
    const { data } = await supabase
      .from("proposals")
      .select("id, title, status, final_price_sar, created_at, clients(name)")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(5);
    proposals = (data ?? []) as unknown as ProposalRow[];
  } catch { /* widget shows error state */ }

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

  // Quick pricing — resolve for user's specialty/city/tier if known
  let quickPricingAnchor: number | null = null;
  let quickPricingSpecialty: string | null = null;
  const specSlug = (profile?.specialty_slug as string | null) ?? null;
  const citySlug = (profile?.city_slug as string | null) ?? null;
  const tierSlug = (profile?.experience_tier_slug as string | null) ?? null;
  if (specSlug && citySlug && tierSlug) {
    try {
      const res = await resolvePrice({
        specialty_slug: specSlug,
        city_slug: citySlug,
        experience_tier_slug: tierSlug,
      });
      if (res.status === "ok") {
        quickPricingAnchor = res.anchor;
        quickPricingSpecialty = specSlug;
      }
    } catch { /* skip gracefully */ }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      {/* Dot-grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />
      <SiteNav locale={locale as "ar" | "en"} />
      <main
        className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20 pb-28"
        dir={dir}
      >
        {/* Page header */}
        <div className="mb-8 sm:mb-10">
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
            proposals={proposals.map((p) => ({
              id: p.id,
              title: p.title,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              client_name: (p.clients as any)?.name ?? null,
              status: p.status,
              final_price_sar: p.final_price_sar,
              created_at: p.created_at,
            }))}
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
      </main>
    </div>
  );
}

