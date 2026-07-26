/**
 * P5.10 — Onboarding page v2.
 *
 * LEGACY SAFETY: users with onboarded_at IS NOT NULL are treated as already
 * onboarded and redirected to /dashboard immediately — they are NOT forced
 * through the new 11-step wizard. This preserves the v0.1 contract exactly.
 *
 * NEW USERS (onboarded_at IS NULL): shown the v2 wizard. Resume from
 * users.onboarding_step if > 0 (i.e. they started but didn't finish).
 *
 * onboarding_completed = true also redirects to dashboard (new users who
 * finished the v2 flow also set onboarded_at via completeOnboarding()).
 */

import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth/AuthCard";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingAurora } from "@/components/onboarding/OnboardingAurora";
import type { OnboardingStep } from "@/components/onboarding/types";
import { loadProfileSnapshot } from "@/lib/profile/snapshot";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // ── Legacy + new-completion guard ──────────────────────────────────────────
  // Existing users (onboarded_at set via v0.1 saveOnboarding/skipOnboarding)
  // and new users who completed v2 (onboarded_at set by completeOnboarding)
  // both get redirected to dashboard. This is the single guard point so that:
  //   a) v0.1 users are never re-trapped in the new wizard.
  //   b) v2 completers don't see the wizard again on re-login.
  const { snapshot, onboardedAt, onboardingCompleted } = await loadProfileSnapshot(supabase, user.id);

  // ── Redirect if already onboarded (legacy v0.1 OR v2 completed) ──────────
  if (onboardedAt || onboardingCompleted) {
    redirect(`/${locale}/dashboard`);
  }

  // ── Load onboarding step config from DB ────────────────────────────────────
  const { data: stepRows } = await supabase
    .from("onboarding_steps")
    .select("id, step_key, title_ar, title_en, required, skippable, estimated_seconds")
    .eq("enabled", true)
    .order("sort_order");

  const steps: OnboardingStep[] = (stepRows ?? []).map((row) => ({
    id: row.id as number,
    step_key: row.step_key as OnboardingStep["step_key"],
    title_ar: row.title_ar as string,
    title_en: row.title_en as string,
    required: row.required as boolean,
    skippable: row.skippable as boolean,
    estimated_seconds: row.estimated_seconds as number | null,
  }));

  const t = await getTranslations({ locale, namespace: "Onboarding" });
  const localeTyped = locale as "ar" | "en";
  // Pass the STORED step (the last one saved, 1-based; 0 = nothing yet) untouched. The
  // wizard resolves the next unfinished step from it via resumeStepIndex — lifting a fresh
  // 0 to 1 here skipped the welcome screen for every new account.
  const initialStep = snapshot.onboarding_step;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-10 sm:py-14 overflow-hidden">
      {/* Living aurora + drifting brand glyphs (feature 006) */}
      <OnboardingAurora />

      {/* Dot-grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.20) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[680px]">
        <AuthCard locale={localeTyped} title="" subtitle="" maxWidthClass="max-w-[680px]">
          <OnboardingWizard
            locale={localeTyped}
            profile={snapshot}
            initialStep={initialStep}
            steps={steps}
          />
        </AuthCard>
      </div>
    </div>
  );
}
