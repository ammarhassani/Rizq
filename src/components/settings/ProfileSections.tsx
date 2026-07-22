"use client";

/**
 * ProfileSections (feature 009) — the Settings → Profile editing surface. Stacks the existing
 * onboarding section editors as independent, self-saving cards (each already calls
 * saveOnboardingStep on "Save"), plus a Testimonials section (the studio-only concept re-homed
 * here). After any section saves it calls onNext → router.refresh(), so the server page
 * recomputes profile strength. Back/Skip are inert in this context (no wizard to navigate).
 */

import { useRouter } from "@/i18n/navigation";
import type { ProfileSnapshot } from "@/components/onboarding/types";
import type { TestimonialRow } from "@/app/actions/proposals/testimonials";
import { StepIdentity } from "@/components/onboarding/StepIdentity";
import { StepLocation } from "@/components/onboarding/StepLocation";
import { StepProfessional } from "@/components/onboarding/StepProfessional";
import { StepRates } from "@/components/onboarding/StepRates";
import { StepPortfolio } from "@/components/onboarding/StepPortfolio";
import { StepBrand } from "@/components/onboarding/StepBrand";
import { StepDefaults } from "@/components/onboarding/StepDefaults";
import { StepGoals } from "@/components/onboarding/StepGoals";
import { TestimonialsEditor } from "@/components/settings/TestimonialsEditor";

type Props = {
  locale: "ar" | "en";
  snapshot: ProfileSnapshot;
  testimonials: TestimonialRow[];
};

const noop = () => {};

export function ProfileSections({ locale, snapshot, testimonials }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Persist happened inside the editor; refresh so the server recomputes strength + the checklist.
  const onSaved = () => router.refresh();

  const stepProps = { locale, profile: snapshot, onNext: onSaved, onBack: noop, onSkip: noop };

  const sections: Array<{ key: string; ar: string; en: string; el: React.ReactNode }> = [
    { key: "identity", ar: "الهوية", en: "Identity", el: <StepIdentity {...stepProps} /> },
    { key: "location", ar: "المدينة", en: "Location", el: <StepLocation {...stepProps} /> },
    { key: "professional", ar: "التخصص والخبرة", en: "Specialty & experience", el: <StepProfessional {...stepProps} /> },
    { key: "rates", ar: "الأسعار", en: "Rates", el: <StepRates {...stepProps} /> },
    { key: "portfolio", ar: "أعمالك", en: "Portfolio", el: <StepPortfolio {...stepProps} /> },
    { key: "brand", ar: "العلامة والتواصل", en: "Brand & contact", el: <StepBrand {...stepProps} /> },
    { key: "defaults", ar: "الإعدادات الافتراضية", en: "Business defaults", el: <StepDefaults {...stepProps} /> },
    { key: "goals", ar: "أهدافك", en: "Goals", el: <StepGoals {...stepProps} /> },
  ];

  return (
    <div dir={dir} className="space-y-4">
      {sections.map((s) => (
        <section key={s.key} className={`rounded-3xl border border-rizq-gold/25 bg-white/60 p-5 sm:p-6 ${font}`}>
          <h2 className={`text-sm font-semibold text-rizq-ink mb-4 ${font}`}>{isAr ? s.ar : s.en}</h2>
          {s.el}
        </section>
      ))}

      {/* Testimonials — re-homed from the retired studio profile. */}
      <section className={`rounded-3xl border border-rizq-gold/25 bg-white/60 p-5 sm:p-6 ${font}`}>
        <h2 className={`text-sm font-semibold text-rizq-ink mb-4 ${font}`}>
          {isAr ? "شهادات العملاء" : "Testimonials"}
        </h2>
        <TestimonialsEditor locale={locale} initial={testimonials} />
      </section>
    </div>
  );
}
