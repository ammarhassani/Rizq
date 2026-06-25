/**
 * src/components/shell/AppShell.tsx — Server Component wrapper.
 *
 * Fetches the current user's profile (name, email, role) from Supabase and
 * passes them down to the client AppShellClient which owns the sidebar +
 * topbar + dot-grid chrome. Pages still do their own auth-gating; this is
 * a light parallel read for display data only (graceful null on failure).
 *
 * Usage in app pages — the shell now owns the centered content column
 * (comfortable padding + max-width). Pages render plain content and pick a
 * width preset; no per-page container/padding boilerplate needed:
 *   <AppShell locale={locale} title="دفتر الدخل" maxWidth="wide">
 *     <div dir={dir}>…</div>
 *   </AppShell>
 */
import { createClient } from "@/lib/supabase/server";
import { AppShellClient } from "./AppShellClient";

/**
 * Content max-width preset for the shell's centered content column.
 *   - "full" (max-w-none)  → full-bleed pages that manage their own columns
 *     (e.g. the proposal editor with its side-docked AI panel).
 *   - "wide" (max-w-5xl)  → list / grid / overview pages (dashboard, proposals,
 *     clients, income, invoices, calendar, documents).
 *   - "reading" (max-w-3xl) → reading / form / detail pages.
 *   - "form" (max-w-2xl)  → narrow single-column forms (rate calculator).
 * Default is "wide" — most app pages are dashboards/lists.
 */
export type AppShellWidth = "full" | "wide" | "reading" | "form";

export type AppShellProps = {
  locale: "ar" | "en";
  /** Compact label shown in the top bar next to the hamburger. Not an h1. */
  title?: string;
  /** Content column max-width preset. Defaults to "wide". */
  maxWidth?: AppShellWidth;
  children: React.ReactNode;
};

export async function AppShell({ locale, title, maxWidth = "wide", children }: AppShellProps) {
  // Light profile fetch — fail gracefully so auth-gated pages still work even
  // if this read errors. Pages do their own redirect(loginPath) guard.
  let name: string | null = null;
  let email: string | null = null;
  let role: string | null = null;

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      email = userData.user.email ?? null;
      const { data: profile } = await supabase
        .from("users")
        .select("name, full_name_ar, role")
        .eq("id", userData.user.id)
        .maybeSingle();

      name =
        (profile?.full_name_ar as string | null) ??
        (profile?.name as string | null) ??
        email?.split("@")[0] ??
        null;
      role = (profile?.role as string | null) ?? null;
    }
  } catch {
    // Non-fatal — shell still renders, just without the profile display.
  }

  return (
    <AppShellClient
      locale={locale}
      title={title}
      maxWidth={maxWidth}
      name={name}
      email={email}
      role={role}
    >
      {children}
    </AppShellClient>
  );
}
