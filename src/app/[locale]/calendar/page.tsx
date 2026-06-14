/**
 * /[locale]/calendar — Calendar UI (M9). Phase-5 task P5.5.
 * Server component. Auth-gated. Fetches calendar_events (RLS-scoped view)
 * and calendar_preferences, then hands off to CalendarClient.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { CalendarClient } from "@/components/calendar/CalendarClient";
import type { CalendarEvent } from "@/lib/calendar/group";

type Params = { locale: string };

type CalendarPreferencesRow = {
  user_id: string;
  default_view: string;
  show_hijri: boolean;
  enabled_sources: unknown;
  working_days: number[];
  working_hours_start: string;
  working_hours_end: string;
};

type CalendarPreferences = {
  default_view: "month" | "week" | "agenda";
  show_hijri: boolean;
  enabled_sources: string[];
  working_days: number[];
  working_hours_start: string;
  working_hours_end: string;
};

const DEFAULT_PREFS: CalendarPreferences = {
  default_view: "month",
  show_hijri: false,
  enabled_sources: ["proposal", "gig", "invoice", "client"],
  working_days: [0, 1, 2, 3, 4], // Sun–Thu
  working_hours_start: "08:00",
  working_hours_end: "17:00",
};

function parsePrefs(row: CalendarPreferencesRow | null): CalendarPreferences {
  if (!row) return DEFAULT_PREFS;

  const validViews = ["month", "week", "agenda"] as const;
  const defaultView = validViews.includes(row.default_view as "month" | "week" | "agenda")
    ? (row.default_view as "month" | "week" | "agenda")
    : "month";

  let enabledSources: string[] = DEFAULT_PREFS.enabled_sources;
  if (Array.isArray(row.enabled_sources)) {
    enabledSources = row.enabled_sources as string[];
  }

  return {
    default_view: defaultView,
    show_hijri: row.show_hijri ?? false,
    enabled_sources: enabledSources,
    working_days: row.working_days ?? DEFAULT_PREFS.working_days,
    working_hours_start: row.working_hours_start ?? DEFAULT_PREFS.working_hours_start,
    working_hours_end: row.working_hours_end ?? DEFAULT_PREFS.working_hours_end,
  };
}

function narrowEvent(raw: Record<string, unknown>): CalendarEvent {
  const sourceModules = ["proposal", "gig", "invoice", "client"] as const;
  const sm = raw.source_module as string;
  const source_module = sourceModules.includes(sm as "proposal" | "gig" | "invoice" | "client")
    ? (sm as "proposal" | "gig" | "invoice" | "client")
    : "gig";

  return {
    event_id: String(raw.event_id ?? ""),
    event_type: String(raw.event_type ?? ""),
    user_id: String(raw.user_id ?? ""),
    client_id: raw.client_id != null ? String(raw.client_id) : null,
    event_date: String(raw.event_date ?? ""),
    title_ar: String(raw.title_ar ?? ""),
    title_en: String(raw.title_en ?? ""),
    status: String(raw.status ?? ""),
    source_module,
    source_id: String(raw.source_id ?? ""),
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Calendar" });
  return { title: `${t("title")} · رِزق` };
}

export default async function CalendarPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const t = await getTranslations({ locale, namespace: "Calendar" });

  // Fetch calendar_events (view RLS-scoped to auth.uid())
  const { data: eventsRaw } = await supabase
    .from("calendar_events")
    .select(
      "event_id, event_type, user_id, client_id, event_date, title_ar, title_en, status, source_module, source_id, metadata"
    )
    .order("event_date", { ascending: true });

  const events: CalendarEvent[] = (eventsRaw ?? []).map((row) =>
    narrowEvent(row as Record<string, unknown>)
  );

  // Fetch calendar_preferences (owner-scoped, may not exist)
  const { data: prefsRaw } = await supabase
    .from("calendar_preferences")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const prefs = parsePrefs(prefsRaw as CalendarPreferencesRow | null);

  return (
    <AppShell locale={locale as "ar" | "en"} title={isAr ? "التقويم" : "Calendar"} maxWidth="wide">
      <div dir={dir}>
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <p className="eyebrow mb-3">{t("eyebrow")}</p>
          <h1 className={`display-2 text-rizq-ink ${font}`}>{t("title")}</h1>
          <p className={`mt-2 text-base text-rizq-ink-soft max-w-md ${font}`}>{t("subtitle")}</p>
        </div>

        {/* Calendar client island */}
        <CalendarClient
          events={events}
          prefs={prefs}
          locale={locale as "ar" | "en"}
        />
      </div>
    </AppShell>
  );
}
