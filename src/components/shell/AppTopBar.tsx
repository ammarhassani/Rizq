"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Menu, LayoutGrid, Sparkles, Search } from "lucide-react";
import { LocaleToggle } from "@/components/landing/LocaleToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AppsLauncher } from "./AppsLauncher";
import { UserMenu } from "./UserMenu";
import { useCommandPalette } from "./CommandPaletteContext";

type Props = {
  locale: "ar" | "en";
  title?: string;
  role: string | null;
  name: string | null;
  email: string | null;
  onOpenMobileSidebar: () => void;
};

export function AppTopBar({
  locale,
  title,
  role,
  name,
  email,
  onOpenMobileSidebar,
}: Props) {
  const t = useTranslations("AppShell");
  const tCmd = useTranslations("CommandPalette");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const [launcherOpen, setLauncherOpen] = useState(false);
  const { setOpen: setPaletteOpen } = useCommandPalette();

  const isFree = role === "free" || role == null;

  return (
    <>
      <header
        dir={dir}
        className={[
          "sticky top-0 z-40 flex items-center gap-2 h-[60px] print:hidden",
          "bg-[var(--surface)] border-b border-[var(--line-2)] px-4 sm:px-[22px]",
        ].join(" ")}
      >
        {/* ── Start: hamburger (mobile) + page title ──────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label={t("topbar.openSidebar")}
            className={[
              "lg:hidden flex items-center justify-center h-11 w-11 rounded-xl shrink-0",
              "text-rizq-ink hover:bg-rizq-green/10 hover:text-rizq-green transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60",
            ].join(" ")}
          >
            <Menu size={20} aria-hidden strokeWidth={1.8} />
          </button>

          {/* Page title — compact breadcrumb, not an h1 */}
          {title && (
            <p
              className={`text-sm text-rizq-ink-soft/80 truncate hidden sm:block ${font}`}
              aria-hidden
            >
              {title}
            </p>
          )}
        </div>

        {/* ── End: actions cluster ────────────────────────────────────────── */}
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Command palette trigger — desktop pill */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={tCmd("triggerAria")}
            className={[
              "hidden sm:inline-flex items-center gap-2 h-9 rounded-[11px] px-3 shrink-0 nm-inset",
              "bg-[var(--raised)] text-[var(--content-muted)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]",
              font,
            ].join(" ")}
          >
            <Search size={15} aria-hidden strokeWidth={1.8} />
            <span className="text-xs">{tCmd("triggerLabel")}</span>
            <kbd
              aria-hidden
              className="ms-1 inline-flex items-center rounded-md border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--content-muted)]"
            >
              {"⌘K"}
            </kbd>
          </button>

          {/* Command palette trigger — mobile icon */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={tCmd("triggerAria")}
            className={[
              "sm:hidden inline-flex items-center justify-center h-11 w-11 rounded-xl shrink-0",
              "text-rizq-ink hover:bg-rizq-green/10 hover:text-rizq-green transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60",
            ].join(" ")}
          >
            <Search size={18} aria-hidden strokeWidth={1.6} />
          </button>

          {/* Apps launcher */}
          <button
            type="button"
            onClick={() => setLauncherOpen(true)}
            aria-label={t("topbar.apps")}
            className={[
              "inline-flex items-center justify-center h-9 w-9 rounded-[11px] shrink-0 nm-raised-sm",
              "bg-[var(--raised)] text-[var(--content-2)] hover:text-[var(--acc)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]",
            ].join(" ")}
          >
            <LayoutGrid size={16} aria-hidden strokeWidth={1.7} />
          </button>

          {/* Theme toggle */}
          <ThemeToggle locale={locale} />

          {/* Locale toggle */}
          <LocaleToggle />

          {/* Upgrade chip — free users only */}
          {isFree && (
            <Link
              href="/upgrade"
              style={{
                background: "color-mix(in srgb, var(--warn) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--warn) 28%, transparent)",
              }}
              className={[
                "hidden sm:inline-flex items-center gap-1.5 rounded-[11px] h-9 px-3 shrink-0",
                "text-[var(--warn)] text-xs font-semibold transition-all hover:brightness-105",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--warn)]",
                font,
              ].join(" ")}
            >
              <Sparkles size={13} aria-hidden strokeWidth={1.8} />
              {t("topbar.upgrade")}
            </Link>
          )}

          {/* Divider */}
          <span aria-hidden className="hidden sm:block h-5 w-px bg-[var(--line)] shrink-0" />

          {/* User menu */}
          <UserMenu locale={locale} name={name} email={email} />
        </div>
      </header>

      {/* Apps launcher overlay */}
      <AppsLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        locale={locale}
      />
    </>
  );
}
