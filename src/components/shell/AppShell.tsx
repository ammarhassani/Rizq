/**
 * src/components/shell/AppShell.tsx — Server Component wrapper.
 *
 * Fetches the current user's profile (name, email, role) from Supabase and
 * passes them down to the client AppShellClient which owns the sidebar +
 * topbar + dot-grid chrome. Pages still do their own auth-gating; this is
 * a light parallel read for display data only (graceful null on failure).
 *
 * Usage in app pages:
 *   <AppShell locale={locale} title="دفتر الدخل">
 *     <main className="mx-auto w-full max-w-3xl px-6 sm:px-10 py-12">…</main>
 *   </AppShell>
 */
import { createClient } from "@/lib/supabase/server";
import { AppShellClient } from "./AppShellClient";

export type AppShellProps = {
  locale: "ar" | "en";
  /** Compact label shown in the top bar next to the hamburger. Not an h1. */
  title?: string;
  children: React.ReactNode;
};

export async function AppShell({ locale, title, children }: AppShellProps) {
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
      name={name}
      email={email}
      role={role}
    >
      {children}
    </AppShellClient>
  );
}
