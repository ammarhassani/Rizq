"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { ChipInput } from "@/components/ui/ChipInput";
import { normalizeNotableClients } from "@/lib/profile/notableClients";
import { NumberStepper } from "./NumberStepper";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";

interface Sample {
  title: string;
  url: string;
  description: string;
}

export function StepPortfolio({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.portfolio");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [samples, setSamples] = useState<Sample[]>(
    (profile.portfolio_samples ?? []).map((s) => ({
      title: s.title,
      url: s.url ?? "",
      description: s.description ?? "",
    }))
  );
  const [totalProjects, setTotalProjects] = useState(
    profile.total_projects_completed?.toString() ?? ""
  );
  const [notableClients, setNotableClients] = useState<string[]>(
    profile.notable_clients ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const addSample = () => {
    if (samples.length >= 20) return;
    setSamples([...samples, { title: "", url: "", description: "" }]);
  };

  const removeSample = (idx: number) => {
    setSamples(samples.filter((_, i) => i !== idx));
  };

  const updateSample = (idx: number, field: keyof Sample, val: string) => {
    setSamples(samples.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("portfolio", {
        portfolio_samples: samples
          .filter((s) => s.title.trim())
          .map((s) => ({
            title: s.title,
            url: s.url || undefined,
            description: s.description || undefined,
          })),
        total_projects_completed: totalProjects ? parseInt(totalProjects, 10) : null,
        notable_clients: normalizeNotableClients(notableClients).length
          ? normalizeNotableClients(notableClients)
          : null,
      });
      if (result.ok) {
        onNext(result.completeness);
      } else {
        setError(tv2("errorSave"));
        onSaveError?.();
      }
    });
  };

  // Settings → Profile: save on change (debounced), no Save button.
  useAutosave(!!autosave, handleSave, [samples, totalProjects, notableClients]);

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`space-y-5 ${font}`}
    >
      {/* Portfolio samples */}
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
                className="text-rizq-ink-soft hover:text-[var(--over)] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              type="text"
              value={sample.title}
              onChange={(e) => updateSample(idx, "title", e.target.value)}
              placeholder={t("sampleTitlePlaceholder")}
              className={inputCls}
              maxLength={120}
            />
            <input
              type="url"
              value={sample.url}
              onChange={(e) => updateSample(idx, "url", e.target.value)}
              placeholder={t("sampleUrl")}
              className={inputCls}
              dir="ltr"
              maxLength={500}
            />
            <input
              type="text"
              value={sample.description}
              onChange={(e) => updateSample(idx, "description", e.target.value)}
              placeholder={t("sampleDescription")}
              className={inputCls}
              maxLength={500}
            />
          </div>
        ))}
        {samples.length < 20 && (
          <button
            type="button"
            onClick={addSample}
            className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-rizq-gold/40 px-4 py-2.5 text-sm text-rizq-ink-soft hover:text-rizq-green hover:border-rizq-green/40 transition-colors ${font}`}
          >
            <Plus size={15} />
            <span>{t("addSample")}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Total projects */}
      <div>
        <label className={labelCls}>{t("totalProjects")}</label>
        <NumberStepper
          locale={locale}
          value={totalProjects}
          onChange={setTotalProjects}
          placeholder={t("totalProjectsPlaceholder")}
          step={1}
          maxDigits={4}
          ariaLabel={t("totalProjects")}
        />
      </div>

      {/* Notable clients */}
      <div>
        <label className={labelCls}>{t("notableClients")}</label>
        <ChipInput
          value={notableClients}
          onChange={setNotableClients}
          placeholder={t("notableClientsPlaceholder")}
          inputClassName={inputCls}
          dir={isAr ? "rtl" : "ltr"}
          removeLabel={t("remove")}
        />
      </div>
      </div>

      {error && (
        <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}

      {autosave ? (
        isPending && (
          <p className={`flex items-center gap-2 text-xs text-rizq-ink-soft ${font}`}>
            <Loader2 size={13} className="animate-spin" />
            {tv2("saving")}
          </p>
        )
      ) : (
        <div className={`flex items-center justify-between gap-3 pt-2 ${font}`}>
          <button
            type="button"
            onClick={onBack}
            disabled={isPending}
            className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
          >
            {tv2("back")}
          </button>
          <div className="flex items-center gap-3 ms-auto">
            <button
              type="button"
              onClick={onSkip}
              disabled={isPending}
              className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
            >
              {tv2("skipStep")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{tv2("saving")}</span>
                </>
              ) : (
                <span>{tv2("save")}</span>
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
