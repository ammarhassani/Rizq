"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/auth/LogoutButton";

type Props = { locale: "ar" | "en"; hideLogout?: boolean };

type AuthState = "loading" | "authed" | "anon";

/**
 * Client-side auth-aware nav slot. Reads the supabase session in the
 * browser so the surrounding SiteNav can remain a pure server component
 * and keep the page in SSG. Renders the "anon" version first (cheap
 * SSG-friendly default) and swaps to "authed" once the session resolves.
 */
export function AuthNavSlot({ locale, hideLogout = false }: Props) {
  const t = useTranslations("Nav");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Optimistic default = anon. If user is signed in we'll flip after the
  // browser auth check resolves. This avoids the flash of "Login" for the
  // common (anon visitor) case while still updating for signed-in users.
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setState(data.user ? "authed" : "anon");
    });
    // Stay in sync with sign-in/sign-out within the tab
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session?.user ? "authed" : "anon");
    });
    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  // While loading, render the same DOM shape as anon to avoid layout shift.
  // The actual links/buttons render as soon as state resolves.
  if (state === "loading" || state === "anon") {
    return (
      <>
        <Link
          href="/login"
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
        >
          <span>{t("login")}</span>
        </Link>
        <Link
          href="/signup"
          className={`hidden sm:inline-flex items-center rounded-full bg-rizq-green text-rizq-cream px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-rizq-green-dark transition-colors ${font}`}
        >
          <span>{t("signup")}</span>
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t("dashboard")}</span>
      </Link>
      <Link
        href="/calendar"
        className={`hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t("calendar")}</span>
      </Link>
      <Link
        href="/hadaf"
        className={`hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t("hadaf")}</span>
      </Link>
      <Link
        href="/invoices"
        className={`hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t("invoices")}</span>
      </Link>
      <Link
        href="/documents"
        className={`hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t("documents")}</span>
      </Link>
      <Link
        href="/rate-calculator"
        className={`hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t("rateCalculator")}</span>
      </Link>
      {!hideLogout && (
        <span className="hidden sm:inline-flex">
          <LogoutButton locale={locale} />
        </span>
      )}
    </>
  );
}
