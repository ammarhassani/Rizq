"use client";

/**
 * StudioProfileForm — Phase C standalone editor for the profile/brand data
 * that powers the proposal "About you" + branding sections.
 *
 * Reuse note: the onboarding StepBrand / StepPortfolio components are tightly
 * coupled to the wizard (StepProps callbacks onNext/onBack/onSkip, Framer
 * Motion slide transitions, wizard nav buttons). Rather than bend them into a
 * standalone editor, this focused form edits the SAME `users` columns via the
 * SAME existing `saveOnboardingStep` server action (called per relevant step
 * key). House style mirrors ClientForm: rounded-xl gold-border cream inputs,
 * green submit, RTL-first, >=44px controls.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { track } from "@/lib/analytics/track";
import { ChipInput } from "@/components/ui/ChipInput";
import { normalizeNotableClients } from "@/lib/profile/notableClients";

type PortfolioSample = { title: string; url: string; description: string };

export type StudioProfileInitial = {
  full_name_ar: string | null;
  brand_name_ar: string | null;
  tagline_ar: string | null;
  logo_url: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  years_experience: number | null;
  total_projects_completed: number | null;
  notable_clients: string[] | null;
  portfolio_samples: Array<{ title: string; url?: string; description?: string }> | null;
};

type Props = {
  locale: "ar" | "en";
  initial: StudioProfileInitial;
};

export function StudioProfileForm({ locale, initial }: Props) {
  const t = useTranslations("StudioProfile");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [fullNameAr, setFullNameAr] = useState(initial.full_name_ar ?? "");
  const [brandNameAr, setBrandNameAr] = useState(initial.brand_name_ar ?? "");
  const [taglineAr, setTaglineAr] = useState(initial.tagline_ar ?? "");
  const [logoUrl, setLogoUrl] = useState(initial.logo_url ?? "");
  const [bioAr, setBioAr] = useState(initial.bio_ar ?? "");
  const [bioEn, setBioEn] = useState(initial.bio_en ?? "");
  const [yearsExperience, setYearsExperience] = useState(
    initial.years_experience?.toString() ?? ""
  );
  const [totalProjects, setTotalProjects] = useState(
    initial.total_projects_completed?.toString() ?? ""
  );
  const [notableClients, setNotableClients] = useState<string[]>(
    initial.notable_clients ?? []
  );
  const [samples, setSamples] = useState<PortfolioSample[]>(
    (initial.portfolio_samples ?? []).map((s) => ({
      title: s.title,
      url: s.url ?? "",
      description: s.description ?? "",
    }))
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`;
  const labelClass = `block text-sm font-medium text-rizq-ink mb-2 ${font}`;

  const addSample = () => {
    if (samples.length >= 20) return;
    setSamples([...samples, { title: "", url: "", description: "" }]);
  };
  const removeSample = (idx: number) =>
    setSamples(samples.filter((_, i) => i !== idx));
  const updateSample = (idx: number, field: keyof PortfolioSample, val: string) =>
    setSamples(samples.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const yearsNum = yearsExperience ? parseInt(yearsExperience, 10) : null;
    const totalNum = totalProjects ? parseInt(totalProjects, 10) : null;
    const notable = normalizeNotableClients(notableClients);
    const cleanSamples = samples
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        url: s.url.trim() || undefined,
        description: s.description.trim() || undefined,
      }));

    startTransition(async () => {
      // Each save writes only its own columns (same per-step contract as the
      // wizard). Run them and fail loud if any leg errors.
      const results = await Promise.all([
        saveOnboardingStep("identity", { full_name_ar: fullNameAr.trim() || null }),
        saveOnboardingStep("brand", {
          brand_name_ar: brandNameAr.trim() || null,
          tagline_ar: taglineAr.trim() || null,
          logo_url: logoUrl.trim() || null,
          bio_ar: bioAr.trim() || null,
          bio_en: bioEn.trim() || null,
        }),
        saveOnboardingStep("professional", {
          years_experience: yearsNum,
        }),
        saveOnboardingStep("portfolio", {
          total_projects_completed: totalNum,
          notable_clients: notable.length > 0 ? notable : null,
          portfolio_samples: cleanSamples,
        }),
      ]);

      if (results.some((r) => !r.ok)) {
        setError(t("errorSave"));
        return;
      }

      track("studio_profile_saved", { locale });
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      dir={dir}
      className={`space-y-6 ${font}`}
      noValidate
    >
      {/* Full name (AR) */}
      <div>
        <label className={labelClass}>{t("fullNameAr")}</label>
        <input
          type="text"
          value={fullNameAr}
          onChange={(e) => setFullNameAr(e.target.value)}
          placeholder={t("fullNameArPlaceholder")}
          className={inputClass}
          maxLength={120}
          dir="rtl"
        />
      </div>

      {/* Brand name + tagline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("brandNameAr")}</label>
          <input
            type="text"
            value={brandNameAr}
            onChange={(e) => setBrandNameAr(e.target.value)}
            placeholder={t("brandNameArPlaceholder")}
            className={inputClass}
            maxLength={120}
            dir="rtl"
          />
        </div>
        <div>
          <label className={labelClass}>{t("taglineAr")}</label>
          <input
            type="text"
            value={taglineAr}
            onChange={(e) => setTaglineAr(e.target.value)}
            placeholder={t("taglineArPlaceholder")}
            className={inputClass}
            maxLength={200}
            dir="rtl"
          />
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label className={labelClass}>
          {t("logoUrl")}{" "}
          <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
        </label>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder={t("logoUrlPlaceholder")}
          className={`${inputClass} font-sans`}
          maxLength={500}
          dir="ltr"
        />
      </div>

      {/* Bio AR */}
      <div>
        <label className={labelClass}>{t("bioAr")}</label>
        <textarea
          value={bioAr}
          onChange={(e) => setBioAr(e.target.value)}
          rows={4}
          placeholder={t("bioArPlaceholder")}
          className={`${inputClass} resize-none`}
          maxLength={1000}
          dir="rtl"
        />
      </div>

      {/* Bio EN */}
      <div>
        <label className={labelClass}>
          {t("bioEn")}{" "}
          <span className="ms-1 text-rizq-ink-soft/60 font-normal">({t("optional")})</span>
        </label>
        <textarea
          value={bioEn}
          onChange={(e) => setBioEn(e.target.value)}
          rows={4}
          placeholder={t("bioEnPlaceholder")}
          className={`${inputClass} resize-none font-sans`}
          maxLength={1000}
          dir="ltr"
        />
      </div>

      {/* Years + total projects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("yearsExperience")}</label>
          <input
            type="number"
            min={0}
            max={60}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            placeholder={t("yearsExperiencePlaceholder")}
            className={`${inputClass} font-sans`}
            dir="ltr"
          />
        </div>
        <div>
          <label className={labelClass}>{t("totalProjects")}</label>
          <input
            type="number"
            min={0}
            value={totalProjects}
            onChange={(e) => setTotalProjects(e.target.value)}
            placeholder={t("totalProjectsPlaceholder")}
            className={`${inputClass} font-sans`}
            dir="ltr"
          />
        </div>
      </div>

      {/* Notable clients */}
      <div>
        <label className={labelClass}>{t("notableClients")}</label>
        <ChipInput
          value={notableClients}
          onChange={setNotableClients}
          placeholder={t("notableClientsPlaceholder")}
          inputClassName={inputClass}
          dir={isAr ? "rtl" : "ltr"}
          removeLabel={isAr ? "إزالة" : "Remove"}
        />
        <p className={`text-xs text-rizq-ink-soft/60 mt-1 ${font}`}>{t("notableClientsHint")}</p>
      </div>

      {/* Portfolio samples */}
      <div>
        <label className={labelClass}>{t("portfolioSamples")}</label>
        <div className="space-y-3">
          {samples.map((sample, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-rizq-gold/30 bg-rizq-cream/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs text-rizq-ink-soft ${font}`}>
                  {isAr ? `مشروع ${idx + 1}` : `Project ${idx + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeSample(idx)}
                  className="p-1.5 text-rizq-ink-soft hover:text-red-600 transition-colors"
                  aria-label={t("removeSample")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <input
                type="text"
                value={sample.title}
                onChange={(e) => updateSample(idx, "title", e.target.value)}
                placeholder={t("sampleTitlePlaceholder")}
                className={inputClass}
                maxLength={120}
              />
              <input
                type="url"
                value={sample.url}
                onChange={(e) => updateSample(idx, "url", e.target.value)}
                placeholder={t("sampleUrlPlaceholder")}
                className={`${inputClass} font-sans`}
                dir="ltr"
                maxLength={500}
              />
              <input
                type="text"
                value={sample.description}
                onChange={(e) => updateSample(idx, "description", e.target.value)}
                placeholder={t("sampleDescriptionPlaceholder")}
                className={inputClass}
                maxLength={500}
              />
            </div>
          ))}
          {samples.length < 20 && (
            <button
              type="button"
              onClick={addSample}
              className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-rizq-gold/40 px-4 py-3 text-sm text-rizq-ink-soft hover:text-rizq-green hover:border-rizq-green/40 transition-colors ${font}`}
            >
              <Plus size={16} />
              <span>{t("addSample")}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={isPending}
          className={`group inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" strokeWidth={2.2} />
              <span>{t("saving")}</span>
            </>
          ) : (
            <span>{t("save")}</span>
          )}
        </button>
        {saved && !isPending && (
          <span className={`inline-flex items-center gap-1.5 text-sm text-rizq-green ${font}`}>
            <Check size={16} strokeWidth={2.4} />
            {t("savedConfirm")}
          </span>
        )}
      </div>
    </form>
  );
}
