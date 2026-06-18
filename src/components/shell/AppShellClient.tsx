"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { NavProgress } from "./NavProgress";
import { CommandPalette } from "./CommandPalette";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "./CommandPaletteContext";
import { AppPageReveal } from "@/components/motion/AppPageReveal";
import type { AppShellWidth } from "./AppShell";

type Props = {
  locale: "ar" | "en";
  title?: string;
  maxWidth?: AppShellWidth;
  role: string | null;
  name: string | null;
  email: string | null;
  children: React.ReactNode;
};

/** Tailwind max-width class per content width preset. */
const MAX_WIDTH_CLASS: Record<AppShellWidth, string> = {
  wide: "max-w-5xl",
  reading: "max-w-3xl",
  form: "max-w-2xl",
};

/**
 * Client shell frame that wires the mobile sidebar Sheet open state
 * between AppTopBar (hamburger) and AppSidebar (Sheet consumer).
 * AppShell (server) renders this with the profile already resolved.
 */
export function AppShellClient(props: Props) {
  return (
    <CommandPaletteProvider>
      <ShellFrame {...props} />
      <CommandPaletteMount locale={props.locale} />
    </CommandPaletteProvider>
  );
}

/** Reads the lifted open-state and renders the palette once for the shell. */
function CommandPaletteMount({ locale }: { locale: "ar" | "en" }) {
  const { open, setOpen } = useCommandPalette();
  return <CommandPalette open={open} onOpenChange={setOpen} locale={locale} />;
}

function ShellFrame({
  locale,
  title,
  maxWidth = "wide",
  role,
  name,
  email,
  children,
}: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const maxWidthClass = MAX_WIDTH_CLASS[maxWidth];

  return (
    // RTL: sidebar sits on the inline-end (right). Using flex-row-reverse for ar
    // keeps the sidebar on the right while the main column scrolls on the left.
    <div
      dir={dir}
      className={[
        "relative min-h-screen flex bg-paper",
        // For RTL we need sidebar on the right: flex-row has sidebar last in DOM
        // but visually on the right via dir=rtl (block-start stays correct).
        "flex-row",
      ].join(" ")}
    >
      {/* Top navigation progress bar — instant feedback on every link click */}
      <NavProgress />

      {/* Dot-grid backdrop — owned by the shell, not individual pages */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          zIndex: 0,
        }}
      />

      {/* Sidebar (desktop sticky + mobile Sheet) */}
      <AppSidebar
        locale={locale}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main column: top bar + scrollable content */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 min-h-screen">
        <AppTopBar
          locale={locale}
          title={title}
          role={role}
          name={name}
          email={email}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        {/* Content column — the shell owns comfortable padding + max-width so
            pages don't float in a void next to the sidebar. Each page only
            picks a width preset and renders its content. AppPageReveal gives
            every navigation a subtle fade+rise entrance (reduced-motion safe). */}
        <main className="flex-1">
          <AppPageReveal
            className={[
              "mx-auto w-full px-5 sm:px-8 lg:px-10 py-6 sm:py-8 pb-16",
              maxWidthClass,
            ].join(" ")}
          >
            {children}
          </AppPageReveal>
        </main>
      </div>
    </div>
  );
}
