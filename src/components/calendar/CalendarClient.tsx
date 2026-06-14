"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Briefcase,
  Receipt,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  groupAgenda,
  eventsForMonth,
  monthGridDays,
  formatDateKey,
  type CalendarEvent,
} from "@/lib/calendar/group";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "agenda";

type SourceFilter = "all" | "proposal" | "gig" | "invoice" | "client";

type CalendarPreferences = {
  default_view: ViewMode;
  show_hijri: boolean;
  enabled_sources: string[];
  working_days: number[];
  working_hours_start: string;
  working_hours_end: string;
};

type Props = {
  events: CalendarEvent[];
  prefs: CalendarPreferences;
  locale: "ar" | "en";
};

// ─── Color coding by source_module ───────────────────────────────────────────

const SOURCE_COLORS: Record<string, { dot: string; badge: string; icon: React.FC<{ size?: number; className?: string }> }> = {
  proposal: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: FileText,
  },
  gig: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Briefcase,
  },
  invoice: {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    icon: Receipt,
  },
  client: {
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Users,
  },
};

function getSourceColor(module: string) {
  return SOURCE_COLORS[module] ?? SOURCE_COLORS.gig!;
}

// ─── Route mapping ────────────────────────────────────────────────────────────

function getEventRoute(event: CalendarEvent): string {
  switch (event.source_module) {
    case "proposal": return `/proposals/${event.source_id}`;
    case "gig":      return `/income/${event.source_id}`;
    case "invoice":  return `/invoices/${event.source_id}`;
    case "client":   return `/clients/${event.source_id}`;
    default:         return "/dashboard";
  }
}

// ─── Hijri date formatter (no external API) ───────────────────────────────────

function formatHijri(date: Date): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
    }).format(date);
  } catch {
    return "";
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const statusMap: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    overdue: "bg-red-50 text-red-700 border-red-200",
    active: "bg-blue-50 text-blue-700 border-blue-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    draft: "bg-gray-50 text-gray-600 border-gray-200",
    in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
    delivered: "bg-teal-50 text-teal-700 border-teal-200",
    cancelled: "bg-gray-50 text-gray-500 border-gray-200",
    final: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const cls = statusMap[status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const label = t(`statusBadge.${status}`, { defaultValue: status });
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Event row (agenda + day view) ───────────────────────────────────────────

function EventRow({
  event,
  locale,
  t,
  onClick,
}: {
  event: CalendarEvent;
  locale: "ar" | "en";
  t: ReturnType<typeof useTranslations>;
  onClick: () => void;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const color = getSourceColor(event.source_module);
  const Icon = color.icon;
  const title = isAr ? event.title_ar : event.title_en;
  const amount =
    (event.metadata.amount_sar as number | undefined) ??
    (event.metadata.total_sar as number | undefined) ??
    null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start flex items-start gap-3 rounded-2xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/60 transition-all group ${font}`}
    >
      <span className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 ${color.badge}`}>
        <Icon size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-rizq-ink truncate ${font}`}>{title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>
            {new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            }).format(new Date(event.event_date + "T00:00:00"))}
          </span>
          <StatusBadge status={event.status} t={t} />
          {amount != null && (
            <span className={`tabular font-sans text-xs font-semibold text-rizq-green`}>
              {new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(amount)}{" "}
              <span className={`font-normal text-rizq-ink-soft/60 ${font}`}>{t("sarLabel")}</span>
            </span>
          )}
        </div>
      </div>
      <span className="text-rizq-ink-soft/30 group-hover:text-rizq-green transition-colors text-xs mt-1 flex-shrink-0 rtl:rotate-180">→</span>
    </button>
  );
}

// ─── Scheduling insight card (rule-based, deterministic) ─────────────────────

function InsightCard({
  events,
  locale,
  t,
}: {
  events: CalendarEvent[];
  locale: "ar" | "en";
  t: ReturnType<typeof useTranslations>;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const now = new Date();
  const groups = groupAgenda(events, now);

  // Count this week's events (today + tomorrow + thisWeek)
  const thisWeekCount =
    groups.today.length + groups.tomorrow.length + groups.thisWeek.length;

  // Count overdue invoices
  const overdueInvoices = groups.overdue.filter(
    (ev) => ev.source_module === "invoice"
  );

  // Find busiest day in the next 7 days
  const upcomingByDay: Record<string, number> = {};
  [...groups.today, ...groups.tomorrow, ...groups.thisWeek].forEach((ev) => {
    upcomingByDay[ev.event_date] = (upcomingByDay[ev.event_date] ?? 0) + 1;
  });
  const busiestEntry = Object.entries(upcomingByDay).sort((a, b) => b[1] - a[1])[0];
  const busiestDayLabel = busiestEntry
    ? new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", { weekday: "long" }).format(
        new Date(busiestEntry[0] + "T00:00:00")
      )
    : null;

  const lines: string[] = [];

  // Events this week
  if (thisWeekCount === 0) {
    lines.push(t("insight.clearWeek"));
  } else if (thisWeekCount === 1) {
    lines.push(t("insight.eventsThisWeek", { n: "١" }));
  } else {
    lines.push(
      t("insight.eventsThisWeekPlural", {
        n: isAr
          ? new Intl.NumberFormat("ar-SA").format(thisWeekCount)
          : String(thisWeekCount),
      })
    );
  }

  // Overdue invoices
  if (overdueInvoices.length === 1) {
    lines.push(t("insight.overdueInvoices"));
  } else if (overdueInvoices.length > 1) {
    lines.push(
      t("insight.overdueInvoicesPlural", {
        n: isAr
          ? new Intl.NumberFormat("ar-SA").format(overdueInvoices.length)
          : String(overdueInvoices.length),
      })
    );
  }

  // Busiest day
  if (busiestDayLabel && busiestEntry && busiestEntry[1] >= 2) {
    lines.push(t("insight.busiestDay", { day: busiestDayLabel }));
  }

  return (
    <div
      className={`rounded-2xl border border-rizq-green/20 bg-rizq-green/5 px-5 py-4 mb-6 ${font}`}
    >
      <p className="text-xs text-rizq-green/70 font-medium uppercase tracking-wide mb-2">
        {t("insight.label")}
      </p>
      <ul className="space-y-1">
        {lines.map((line, i) => (
          <li key={i} className={`text-sm text-rizq-ink flex items-start gap-2 ${font}`}>
            <span className="text-rizq-green mt-0.5 flex-shrink-0">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  events,
  locale,
  showHijri,
  t,
  onDaySelect,
  selectedDay,
  year,
  month,
}: {
  events: CalendarEvent[];
  locale: "ar" | "en";
  showHijri: boolean;
  t: ReturnType<typeof useTranslations>;
  onDaySelect: (dateKey: string) => void;
  selectedDay: string | null;
  year: number;
  month: number;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const grid = useMemo(() => monthGridDays(year, month), [year, month]);
  const monthEvents = useMemo(() => eventsForMonth(events, year, month), [events, year, month]);

  // Build a map: dateKey → events[]
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of monthEvents) {
      const key = ev.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [monthEvents]);

  const todayKey = formatDateKey(new Date());

  // Weekday headers, Sunday-first.
  // In RTL, the grid flows right-to-left visually:
  //   column index 0 (Sunday) appears on the RIGHT in Arabic.
  // We keep the array Sun→Sat and use CSS direction to reverse display.
  const weekdayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  // Weekend days (Fri=5, Sat=6)
  const isWeekend = (dow: number) => dow === 5 || dow === 6;

  return (
    <div className="select-none">
      {/* Weekday header row — Sunday-first; RTL reverses visually via dir="rtl" */}
      <div className="grid grid-cols-7 mb-1" dir={isAr ? "rtl" : "ltr"}>
        {weekdayKeys.map((dk) => (
          <div
            key={dk}
            className={`text-center text-xs py-2 font-medium ${
              dk === "fri" || dk === "sat"
                ? "text-rizq-gold/70"
                : "text-rizq-ink-soft/60"
            } ${font}`}
          >
            {t(`weekdaysShort.${dk}`)}
          </div>
        ))}
      </div>

      {/* Grid cells — dir="rtl" makes column 0 (Sun) appear on the right in Arabic */}
      <div className="grid grid-cols-7 gap-px bg-rizq-gold/10 rounded-2xl overflow-hidden border border-rizq-gold/15" dir={isAr ? "rtl" : "ltr"}>
        {(() => {
          // In RTL the CSS grid direction (dir="rtl") automatically places
          // cell 0 on the right-hand side, so the order Sun..Sat reads correctly
          // right-to-left without JS reordering.
          const cells = grid;

          return cells.map((cell, idx) => {
            const key = formatDateKey(cell.date);
            const dayEvents = eventsByDay[key] ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const dow = cell.date.getDay();
            const weekend = isWeekend(dow);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onDaySelect(key)}
                className={`
                  min-h-[56px] sm:min-h-[72px] p-1.5 text-start flex flex-col transition-colors
                  ${cell.isCurrentMonth ? "bg-white/80" : "bg-rizq-cream/30"}
                  ${weekend && cell.isCurrentMonth ? "bg-amber-50/40" : ""}
                  ${isSelected ? "ring-2 ring-inset ring-rizq-green/60 bg-rizq-green/5" : ""}
                  hover:bg-rizq-cream/80
                `}
              >
                {/* Day number */}
                <span
                  className={`
                    inline-flex items-center justify-center rounded-full w-7 h-7 text-xs font-medium leading-none mb-0.5
                    ${isToday ? "bg-rizq-green text-rizq-cream" : ""}
                    ${!isToday && cell.isCurrentMonth ? (weekend ? "text-rizq-gold/80" : "text-rizq-ink") : "text-rizq-ink-soft/40"}
                    ${font}
                  `}
                >
                  {isAr
                    ? new Intl.NumberFormat("ar-SA").format(cell.dayNumber)
                    : cell.dayNumber}
                </span>
                {/* Hijri */}
                {showHijri && cell.isCurrentMonth && (
                  <span className="text-[9px] text-rizq-ink-soft/40 leading-none mb-0.5 font-arabic truncate w-full">
                    {formatHijri(cell.date)}
                  </span>
                )}
                {/* Event dots (max 3) */}
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {dayEvents.slice(0, 3).map((ev, i) => {
                    const color = getSourceColor(ev.source_module);
                    return (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`}
                        title={isAr ? ev.title_ar : ev.title_en}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-rizq-ink-soft/50 leading-none">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ─── Agenda view ─────────────────────────────────────────────────────────────

function AgendaView({
  events,
  locale,
  t,
  onEventClick,
}: {
  events: CalendarEvent[];
  locale: "ar" | "en";
  t: ReturnType<typeof useTranslations>;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const groups = useMemo(() => groupAgenda(events, new Date()), [events]);

  const sections = [
    { key: "overdue" as const, events: groups.overdue, urgent: true },
    { key: "today" as const, events: groups.today, urgent: false },
    { key: "tomorrow" as const, events: groups.tomorrow, urgent: false },
    { key: "thisWeek" as const, events: groups.thisWeek, urgent: false },
    { key: "nextWeek" as const, events: groups.nextWeek, urgent: false },
    { key: "later" as const, events: groups.later, urgent: false },
  ].filter((s) => s.events.length > 0);

  if (sections.length === 0) {
    return (
      <p className={`text-sm text-rizq-ink-soft/60 py-10 text-center ${font}`}>
        {t("emptyAgenda")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.key}>
          <h3
            className={`text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2 ${
              section.urgent ? "text-red-600" : "text-rizq-ink-soft/50"
            } ${font}`}
          >
            {section.urgent && <AlertCircle size={12} />}
            {t(`agendaGroups.${section.key}`)}
          </h3>
          <div className="space-y-2">
            {section.events.map((ev) => (
              <EventRow
                key={ev.event_id}
                event={ev}
                locale={locale}
                t={t}
                onClick={() => onEventClick(ev)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  events,
  locale,
  t,
  onEventClick,
}: {
  events: CalendarEvent[];
  locale: "ar" | "en";
  t: ReturnType<typeof useTranslations>;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  // Build current week Sun–Sat
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const weekDays = useMemo(() => {
    const dow = today.getDay(); // 0=Sun
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getTime() + (i - dow) * 86400000);
      return d;
    });
  }, [today]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = ev.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const todayKey = formatDateKey(today);

  const displayDays = isAr ? [...weekDays].reverse() : weekDays;

  return (
    <div className="space-y-3" dir={isAr ? "rtl" : "ltr"}>
      {displayDays.map((day) => {
        const key = formatDateKey(day);
        const dayEvents = eventsByDay[key] ?? [];
        const isToday = key === todayKey;
        const dow = day.getDay();
        const isWeekend = dow === 5 || dow === 6;

        return (
          <div
            key={key}
            className={`rounded-2xl border p-4 ${
              isToday
                ? "border-rizq-green/40 bg-rizq-green/5"
                : isWeekend
                ? "border-amber-200/40 bg-amber-50/20"
                : "border-rizq-gold/15 bg-white/50"
            }`}
          >
            {/* Day header */}
            <div className={`flex items-center gap-2 mb-3 ${font}`}>
              <span
                className={`text-sm font-semibold ${
                  isToday ? "text-rizq-green" : isWeekend ? "text-rizq-gold/80" : "text-rizq-ink"
                } ${font}`}
              >
                {new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }).format(day)}
              </span>
              {isToday && (
                <span className={`text-xs rounded-full bg-rizq-green text-rizq-cream px-2 py-0.5 ${font}`}>
                  {t("today")}
                </span>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <p className={`text-xs text-rizq-ink-soft/40 ${font}`}>{t("emptyDay")}</p>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((ev) => (
                  <EventRow
                    key={ev.event_id}
                    event={ev}
                    locale={locale}
                    t={t}
                    onClick={() => onEventClick(ev)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Day panel (shown when a day is tapped in month view) ─────────────────────

function DayPanel({
  dateKey,
  events,
  locale,
  t,
  onEventClick,
  onClose,
}: {
  dateKey: string;
  events: CalendarEvent[];
  locale: "ar" | "en";
  t: ReturnType<typeof useTranslations>;
  onEventClick: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const date = new Date(dateKey + "T00:00:00");
  const label = new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const dayEvents = events.filter((ev) => ev.event_date === dateKey);

  return (
    <div className={`mt-4 rounded-2xl border border-rizq-gold/20 bg-white/70 p-5 ${font}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold text-rizq-ink ${font}`}>{label}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-rizq-ink-soft/50 hover:text-rizq-ink transition-colors"
        >
          ✕
        </button>
      </div>
      {dayEvents.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft/50 text-center py-4 ${font}`}>{t("emptyDay")}</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((ev) => (
            <EventRow
              key={ev.event_id}
              event={ev}
              locale={locale}
              t={t}
              onClick={() => onEventClick(ev)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main CalendarClient ──────────────────────────────────────────────────────

export function CalendarClient({ events, prefs, locale }: Props) {
  const t = useTranslations("Calendar");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [view, setView] = useState<ViewMode>(prefs.default_view);
  const [showHijri, setShowHijri] = useState(prefs.show_hijri);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Month navigation state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Filtered events by source
  const filteredEvents = useMemo(() => {
    if (sourceFilter === "all") return events;
    return events.filter((ev) => ev.source_module === sourceFilter);
  }, [events, sourceFilter]);

  // Check which sources are enabled per prefs
  const enabledSources: SourceFilter[] = useMemo(() => {
    const all: SourceFilter[] = ["proposal", "gig", "invoice", "client"];
    if (!prefs.enabled_sources || prefs.enabled_sources.length === 0) return all;
    return all.filter((s) => prefs.enabled_sources.includes(s));
  }, [prefs.enabled_sources]);

  function handleEventClick(event: CalendarEvent) {
    const route = getEventRoute(event);
    router.push(`/${locale}${route}`);
  }

  function handleDaySelect(dateKey: string) {
    setSelectedDay((prev) => (prev === dateKey ? null : dateKey));
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }
  function goToday() {
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDay(null);
  }

  const monthLabel = new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory" : "en-US", {
    year: "numeric",
    month: "long",
  }).format(new Date(calYear, calMonth, 1));

  const views: Array<{ key: ViewMode; label: string }> = [
    { key: "month", label: t("viewMonth") },
    { key: "week", label: t("viewWeek") },
    { key: "agenda", label: t("viewAgenda") },
  ];

  const sourceChipsAll: Array<{ key: SourceFilter; label: string }> = [
    { key: "all", label: t("sourceFilters.all") },
    { key: "proposal", label: t("sourceFilters.proposal") },
    { key: "gig", label: t("sourceFilters.gig") },
    { key: "invoice", label: t("sourceFilters.invoice") },
    { key: "client", label: t("sourceFilters.client") },
  ];
  const sourceChips = sourceChipsAll.filter(
    (c): c is { key: SourceFilter; label: string } =>
      c.key === "all" || enabledSources.includes(c.key as SourceFilter)
  );

  return (
    <div className="space-y-5" dir={dir}>
      {/* ── AI Scheduling insight card (rule-based) ─────────────────────────── */}
      <InsightCard events={events} locale={locale} t={t} />

      {/* ── View switcher ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" dir={dir}>
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => { setView(v.key); setSelectedDay(null); }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              view === v.key
                ? "bg-rizq-green text-rizq-cream"
                : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
            } ${font}`}
          >
            {v.label}
          </button>
        ))}

        {/* Hijri toggle */}
        <button
          type="button"
          onClick={() => setShowHijri((h) => !h)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
            showHijri
              ? "bg-rizq-gold/20 text-rizq-ink border border-rizq-gold/40"
              : "border border-rizq-gold/20 bg-white/50 text-rizq-ink-soft/60 hover:border-rizq-gold/40"
          } ${font}`}
        >
          {t("toggleHijri")}
        </button>
      </div>

      {/* ── Source filter chips ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" dir={dir}>
        {sourceChips.map((c) => {
          const color = c.key !== "all" ? getSourceColor(c.key) : null;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSourceFilter(c.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all flex items-center gap-1.5 ${
                sourceFilter === c.key
                  ? (color ? `${color.badge} border` : "bg-rizq-green text-rizq-cream")
                  : "border border-rizq-gold/25 bg-white/50 text-rizq-ink-soft/60 hover:border-rizq-green/30"
              } ${font}`}
            >
              {color && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />}
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── Month view ─────────────────────────────────────────────────────── */}
      {view === "month" && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between gap-2" dir={dir}>
            <button
              type="button"
              onClick={isAr ? nextMonth : prevMonth}
              aria-label={t("prevMonth")}
              className="rounded-full p-2 border border-rizq-gold/20 bg-white/50 hover:border-rizq-green/40 transition-colors text-rizq-ink"
            >
              {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <div className="flex items-center gap-3">
              <span className={`text-base font-semibold text-rizq-ink ${font}`}>
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={goToday}
                className={`rounded-full px-3 py-1 text-xs border border-rizq-green/30 text-rizq-green hover:bg-rizq-green/10 transition-colors ${font}`}
              >
                {t("today")}
              </button>
            </div>
            <button
              type="button"
              onClick={isAr ? prevMonth : nextMonth}
              aria-label={t("nextMonth")}
              className="rounded-full p-2 border border-rizq-gold/20 bg-white/50 hover:border-rizq-green/40 transition-colors text-rizq-ink"
            >
              {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          <MonthView
            events={filteredEvents}
            locale={locale}
            showHijri={showHijri}
            t={t}
            onDaySelect={handleDaySelect}
            selectedDay={selectedDay}
            year={calYear}
            month={calMonth}
          />

          {/* Day events panel */}
          {selectedDay && (
            <DayPanel
              dateKey={selectedDay}
              events={filteredEvents}
              locale={locale}
              t={t}
              onEventClick={handleEventClick}
              onClose={() => setSelectedDay(null)}
            />
          )}
        </>
      )}

      {/* ── Agenda view ────────────────────────────────────────────────────── */}
      {view === "agenda" && (
        <AgendaView
          events={filteredEvents}
          locale={locale}
          t={t}
          onEventClick={handleEventClick}
        />
      )}

      {/* ── Week view ──────────────────────────────────────────────────────── */}
      {view === "week" && (
        <WeekView
          events={filteredEvents}
          locale={locale}
          t={t}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  );
}
