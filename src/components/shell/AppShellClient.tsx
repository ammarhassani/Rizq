"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";

type Props = {
  locale: "ar" | "en";
  title?: string;
  role: string | null;
  name: string | null;
  email: string | null;
  children: React.ReactNode;
};

/**
 * Client shell frame that wires the mobile sidebar Sheet open state
 * between AppTopBar (hamburger) and AppSidebar (Sheet consumer).
 * AppShell (server) renders this with the profile already resolved.
 */
export function AppShellClient({ locale, title, role, name, email, children }: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const dir = locale === "ar" ? "rtl" : "ltr";

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
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
