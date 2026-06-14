"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PanelLeftClose, PanelLeftOpen, ChevronRight } from "lucide-react";
import { APPS, type AppGroup } from "@/lib/apps";

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
                className={`mb-0.5 px-2 text-[10px] uppercase tracking-[0.18em] text-rizq-gold-dark/70 select-none ${font}`}
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
                    "group relative flex items-center gap-3 rounded-xl px-2.5 transition-all min-h-[44px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60",
                    active
                      ? "bg-rizq-green text-rizq-cream shadow-sm"
                      : "text-rizq-ink hover:bg-rizq-green/8 hover:text-rizq-green hover:-translate-y-px",
                    collapsed ? "justify-center" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.6}
                    aria-hidden
                    className="shrink-0"
                  />
                  {!collapsed && (
                    <span className={`text-sm truncate ${font}`}>
                      {t(`apps.${app.id}.name`)}
                    </span>
                  )}
                  {/* Gold hairline indicator for active when not collapsed */}
                  {active && !collapsed && (
                    <ChevronRight
                      size={12}
                      aria-hidden
                      className="ms-auto shrink-0 opacity-60"
                    />
                  )}
                </Link>
              );
            })}
            {/* Gold hairline separator between groups */}
            <div className="mt-1 mb-1 h-px bg-rizq-gold/20 mx-2" aria-hidden />
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
  const sidebarWidth = collapsed ? "w-[60px]" : "w-[220px]";

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────────── */}
      <aside
        className={[
          "hidden lg:flex flex-col shrink-0 transition-[width] duration-200 ease-in-out",
          "sticky top-0 h-screen overflow-y-auto overflow-x-hidden",
          "bg-rizq-cream/98 border-s border-rizq-gold/20",
          sidebarWidth,
        ].join(" ")}
        aria-label={t("topbar.openSidebar")}
      >
        {/* Brand mark at top */}
        <div className="flex items-center justify-between gap-2 px-3 py-4 border-b border-rizq-gold/15 shrink-0">
          {!collapsed && (
            <Link
              href="/"
              className={`font-arabic text-xl font-bold text-rizq-green hover:text-rizq-green-dark transition-colors truncate ${font}`}
            >
              رِزق
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
          className="w-[260px] bg-rizq-cream/98 p-0 flex flex-col"
          showCloseButton
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-rizq-gold/15">
            <SheetTitle className={`font-arabic text-xl font-bold text-rizq-green ${font}`}>
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
