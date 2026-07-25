"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";

type PrimaryGoal =
  | "increase_income"
  | "stabilize_income"
  | "build_brand"
  | "track_finances"
  | "qualify_hadaf"
  | "find_clients";

type Tone = "formal" | "balanced" | "friendly";

export function StepGoals({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.goals");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(
    profile.primary_goal ?? "increase_income"
  );
  const [usesBahr, setUsesBahr] = useState(profile.uses_bahr ?? false);
  const [usesMostaql, setUsesMostaql] = useState(profile.uses_mostaql ?? false);
  const [usesKhamsat, setUsesKhamsat] = useState(profile.uses_khamsat ?? false);
  const [tone, setTone] = useState<Tone>(profile.preferred_tone ?? "balanced");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const goalOptions: Array<{ value: PrimaryGoal; label: string }> = [
    { value: "increase_income", label: t("goalIncreaseIncome") },
    { value: "stabilize_income", label: t("goalStabilizeIncome") },
    { value: "build_brand", label: t("goalBuildBrand") },
    { value: "track_finances", label: t("goalTrackFinances") },
    { value: "qualify_hadaf", label: t("goalQualifyHadaf") },
    { value: "find_clients", label: t("goalFindClients") },
  ];

  const toneOptions: Array<{ value: Tone; label: string }> = [
    { value: "formal", label: t("toneFormal") },
    { value: "balanced", label: t("toneBalanced") },
    { value: "friendly", label: t("toneFriendly") },
  ];

  const platformOptions: Array<{ key: "bahr" | "mostaql" | "khamsat"; label: string; state: boolean; set: (v: boolean) => void }> = [
    { key: "bahr", label: t("bahr"), state: usesBahr, set: setUsesBahr },
    { key: "mostaql", label: t("mostaql"), state: usesMostaql, set: setUsesMostaql },
    { key: "khamsat", label: t("khamsat"), state: usesKhamsat, set: setUsesKhamsat },
  ];

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("goals", {
        primary_goal: primaryGoal,
        uses_bahr: usesBahr,
        uses_mostaql: usesMostaql,
        uses_khamsat: usesKhamsat,
        preferred_tone: tone,
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
  useAutosave(!!autosave, handleSave, [primaryGoal, usesBahr, usesMostaql, usesKhamsat, tone]);

  const pillCls = (selected: boolean) =>
    `rounded-2xl border px-4 py-2 text-sm transition-all ${
      selected
        ? "border-rizq-green bg-rizq-green/10 text-rizq-green"
        : "border-[#8f7e48] bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
    } ${font}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 ${font}`}
    >
      {/* Primary goal */}
      <div>
        <p className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}>
          {t("primaryGoal")}
        </p>
        <div className="flex flex-wrap gap-2">
          {goalOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPrimaryGoal(opt.value)}
              aria-pressed={primaryGoal === opt.value}
              className={pillCls(primaryGoal === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platforms used */}
      <div>
        <p className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}>
          {t("platformsUsed")}
        </p>
        <div className="flex flex-wrap gap-2">
          {platformOptions.map(({ key, label, state, set }) => (
            <button
              key={key}
              type="button"
              onClick={() => set(!state)}
              aria-pressed={state}
              className={pillCls(state)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="sm:col-span-2">
        <p className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}>
          {t("preferredTone")}
        </p>
        <div className="flex flex-wrap gap-2">
          {toneOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTone(opt.value)}
              aria-pressed={tone === opt.value}
              className={pillCls(tone === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className={`sm:col-span-2 text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}

      {autosave ? (
        isPending && (
          <p className={`sm:col-span-2 flex items-center gap-2 text-xs text-rizq-ink-soft ${font}`}>
            <Loader2 size={13} className="animate-spin" />
            {tv2("saving")}
          </p>
        )
      ) : (
        <div className={`sm:col-span-2 flex items-center justify-between gap-3 pt-2 ${font}`}>
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
