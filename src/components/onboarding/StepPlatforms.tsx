"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";
import { isSupportedUrl } from "@/lib/validation/fieldErrors";
import type { FieldErrorReason } from "@/lib/validation/fieldErrors";

// Freelancer platform-presence links. Columns + write-grants already exist
// (migration 20260613230814); this step wires them into the wizard. Labels are
// mostly platform brand names, so they're bilingual inline rather than catalog keys.
const FIELDS = [
  { key: "bahr_profile_url", ar: "بحر", en: "Bahr", ph: "https://bahr.sa/..." },
  { key: "mostaql_profile_url", ar: "مستقل", en: "Mostaql", ph: "https://mostaql.com/u/..." },
  { key: "khamsat_profile_url", ar: "خمسات", en: "Khamsat", ph: "https://khamsat.com/user/..." },
  { key: "linkedin_url", ar: "لينكدإن", en: "LinkedIn", ph: "https://linkedin.com/in/..." },
  { key: "behance_url", ar: "بيهانس", en: "Behance", ph: "https://behance.net/..." },
  { key: "personal_website_url", ar: "موقعك الشخصي", en: "Personal website", ph: "https://..." },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

/**
 * Why this link cannot be saved, or null when it can. Mirrors the server allow-list so the
 * freelancer sees the reason before a round trip; the server still enforces it.
 */
function urlProblem(raw: string): FieldErrorReason | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "invalid_url";
  }
  return isSupportedUrl(parsed.href) ? null : "unsupported_scheme";
}

export function StepPlatforms({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
  const tv2 = useTranslations("Onboarding.v2");
  const tValidation = useTranslations("Validation");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [urls, setUrls] = useState<Record<FieldKey, string>>(() => ({
    bahr_profile_url: profile.bahr_profile_url ?? "",
    mostaql_profile_url: profile.mostaql_profile_url ?? "",
    khamsat_profile_url: profile.khamsat_profile_url ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    behance_url: profile.behance_url ?? "",
    personal_website_url: profile.personal_website_url ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, FieldErrorReason>>>({});
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const set = (key: FieldKey, val: string) => setUrls((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      // Per-field: normalize a missing scheme (the #1 real cause — "linkedin.com/x"),
      // then validate each independently. Save the VALID links; flag only the bad
      // ones instead of rejecting the whole step.
      const payload: Record<string, string> = {};
      const bad: Partial<Record<FieldKey, FieldErrorReason>> = {};
      for (const f of FIELDS) {
        const raw = urls[f.key].trim();
        if (!raw) {
          payload[f.key] = ""; // cleared → action coerces to null
          continue;
        }
        // Only a bare host gets a scheme added. A typed scheme is left alone so an
        // unsupported one is reported as unsupported rather than mangled into a bad URL.
        const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
        const normalized = hasScheme ? raw : `https://${raw}`;
        const problem = urlProblem(normalized);
        if (problem) bad[f.key] = problem; // omitted from payload → prior value kept
        else payload[f.key] = normalized;
      }
      setFieldErrors(bad);

      const result = await saveOnboardingStep("platforms", payload);
      if (!result.ok) {
        if (result.code === "invalid" && result.fields?.length) {
          // Permanent: name the field. Retry copy would be false guidance.
          const fromServer = { ...bad };
          for (const fe of result.fields) {
            fromServer[fe.field as FieldKey] = fe.reason;
          }
          setFieldErrors(fromServer);
          return;
        }
        setError(tv2("errorSave"));
        onSaveError?.();
        return;
      }
      if (Object.keys(bad).length > 0) {
        // Valid links saved; stay on the step so the user can fix the flagged one(s).
        return;
      }
      onNext(result.completeness);
    });
  };

  useAutosave(!!autosave, handleSave, [urls]);

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`space-y-4 ${font}`}
    >
      <p className={`text-sm text-rizq-ink-soft ${font}`}>
        {isAr
          ? "روابط ملفاتك على المنصات (اختياري) — تعزّز مصداقيتك في العروض."
          : "Your platform profile links (optional) — they strengthen your credibility in proposals."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className={labelCls} htmlFor={f.key}>
              {isAr ? f.ar : f.en}
            </label>
            <input
              id={f.key}
              type="url"
              inputMode="url"
              dir="ltr"
              value={urls[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              placeholder={f.ph}
              aria-invalid={fieldErrors[f.key] ? true : undefined}
              aria-describedby={fieldErrors[f.key] ? `${f.key}-error` : undefined}
              className={`${inputCls} ${fieldErrors[f.key] ? "border-[var(--over)] focus:border-[var(--over)]" : ""}`}
              maxLength={500}
            />
            {fieldErrors[f.key] && (
              <p id={`${f.key}-error`} className={`mt-1 text-xs text-[var(--over)] ${font}`}>
                {tValidation(fieldErrors[f.key]!)}
              </p>
            )}
          </div>
        ))}
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
