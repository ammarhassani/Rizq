"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLinkStatus } from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { APPS, type AppGroup } from "@/lib/apps";

/**
 * Renders the leading glyph for a sidebar item: the app icon normally, or a
 * spinner while THIS link's navigation is pending (Next 16 useLinkStatus).
 * Must be a child of the next-intl <Link> (which renders next/link) so the
 * pending context is available.
 */
function SidebarItemIcon({
  Icon,
  active,
}: {
  Icon: LucideIcon;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <Loader2
        size={18}
        strokeWidth={2.2}
        aria-hidden
        className="shrink-0 animate-spin"
      />
    );
  }
  return (
    <Icon
      size={18}
      strokeWidth={active ? 2.2 : 1.6}
      aria-hidden
      className="shrink-0 transition-transform duration-150 group-hover:scale-110 group-active:scale-95"
    />
  );
}

const STORAGE_KEY = "rizq.sidebar.collapsed";

const GROUP_ORDER: AppGroup[] = ["home", "work", "money", "tools", "account"];

type Props = {
  locale: "ar" | "en";
  /** Controlled open state for the mobile Sheet (lifted from AppTopBar hamburger) */
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function SidebarNav({
  locale,
  collapsed,
}: {
  locale: "ar" | "en";
  collapsed: boolean;
}) {
  const t = useTranslations("AppShell");
  const rawPathname = usePathname(); // without locale prefix
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  /** Check active: compare the raw pathname (no locale prefix) with each app href */
  function isActive(href: string) {
    if (href === "/dashboard") return rawPathname === "/dashboard";
    return rawPathname.startsWith(href);
  }

  const sidebarApps = APPS.filter((a) => a.sidebar);

  return (
    <nav aria-label={t("topbar.openSidebar")} className="flex flex-col gap-0.5 px-2 py-2">
      {GROUP_ORDER.map((group) => {
        const groupApps = sidebarApps.filter((a) => a.group === group);
        if (groupApps.length === 0) return null;
        return (
          <div key={group} className="mb-1">
            {/* Group label — hidden when collapsed */}
            {!collapsed && (
              <p
                className={`mt-2.5 mb-1.5 px-1.5 text-[9px] uppercase tracking-[0.2em] text-[var(--content-faint)] select-none ${font}`}
              >
                {t(`groups.${group}`)}
              </p>
            )}
            {groupApps.map((app) => {
              const active = isActive(app.href);
              const Icon = app.icon;
              return (
                <Link
                  key={app.id}
                  href={app.href as "/dashboard"}
                  aria-label={t(`apps.${app.id}.name`)}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group relative flex items-center gap-3 rounded-[13px] px-3 py-2.5 mb-[3px]",
                    "transition-colors duration-150 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]",
                    active
                      ? "aurora-fill shadow-[0_0_18px_-4px_rgba(52,230,168,.6)] font-bold"
                      : "text-[var(--content-2)] hover:bg-[var(--line-2)] hover:text-[var(--content)]",
                    collapsed ? "justify-center" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <SidebarItemIcon Icon={Icon} active={active} />
                  {!collapsed && (
                    <span className={`text-sm truncate ${font}`}>
                      {t(`apps.${app.id}.name`)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ locale, mobileOpen, onMobileClose }: Props) {
  const t = useTranslations("AppShell");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Persist collapse state
  const [collapsed, setCollapsed] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch { /* localStorage may be blocked */ }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  }

  // RTL: sidebar sits on the inline-end (right in ar)
  const sidebarWidth = collapsed ? "w-[64px]" : "w-[248px]";

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────────── */}
      <aside
        className={[
          "hidden lg:flex flex-col shrink-0 transition-[width] duration-200 ease-in-out print:!hidden",
          "sticky top-0 h-screen overflow-y-auto overflow-x-hidden",
          "bg-[var(--panel)] border-s border-[var(--line-2)]",
          sidebarWidth,
        ].join(" ")}
        aria-label={t("topbar.openSidebar")}
      >
        {/* Brand mark at top */}
        <div className="flex items-center justify-between gap-2 px-4 pt-[18px] pb-3 shrink-0">
          {!collapsed && (
            <Link href="/" aria-label="رِزق">
              <span
                className="inline-flex items-center rounded-2xl bg-[var(--raised)] px-4 py-1.5 font-display text-[22px] font-bold leading-none aurora-text"
                style={{
                  boxShadow:
                    "4px 4px 9px var(--nm-dark), -4px -4px 9px var(--nm-light), 0 0 20px -6px rgba(52,230,168,.5)",
                }}
              >
                رِزق
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t("topbar.openSidebar") : t("topbar.openSidebar")}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-rizq-ink-soft hover:bg-rizq-green/10 hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60 shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} aria-hidden strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={16} aria-hidden strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarNav locale={locale} collapsed={collapsed} />
        </div>
      </aside>

      {/* ── Mobile Sheet drawer ─────────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose(); }}>
        <SheetContent
          side={locale === "ar" ? "right" : "left"}
          className="w-[260px] bg-[var(--surface)] p-0 flex flex-col"
          showCloseButton
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
            <SheetTitle className="font-display text-2xl font-bold aurora-text">
              رِزق
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav locale={locale} collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
