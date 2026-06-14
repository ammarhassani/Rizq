"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { CITIES, SPECIALTIES } from "@/lib/refData";
import { Combobox } from "@/components/ui/Combobox";
import { saveOnboarding, skipOnboarding } from "@/app/actions/profile/saveOnboarding";

type Props = { locale: "ar" | "en" };

export function OnboardingForm({ locale }: Props) {
  const t = useTranslations("Onboarding");
  const tShared = useTranslations("Auth.shared");
  const tCommon = useTranslations("Common");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [language, setLanguage] = useState<"ar" | "en">(locale);
  const [city, setCity] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [isSkipping, startSkipping] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveOnboarding({
        preferred_language: language,
        city: city || null,
        specialty: specialty || null,
      });

      if (result.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setError(tShared("genericError"));
    });
  };

  const onSkip = () => {
    startSkipping(async () => {
      await skipOnboarding(locale);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Language preference */}
      <fieldset>
        <legend className={`block text-sm font-medium text-rizq-ink mb-3 ${font}`}>
          {t("languageLabel")}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(["ar", "en"] as const).map((opt) => {
            const label = opt === "ar" ? t("languageAr") : t("languageEn");
            const optFont = opt === "ar" ? "font-arabic" : "font-sans";
            const selected = language === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setLanguage(opt)}
                className={`rounded-2xl border px-4 py-3 text-sm transition-all ${
                  selected
                    ? "border-rizq-green bg-rizq-green/10 text-rizq-green"
                    : "border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
                } ${optFont}`}
                aria-pressed={selected}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* City */}
      <div>
        <label
          htmlFor="city-select"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("cityLabel")}
        </label>
        <Combobox
          id="city-select"
          locale={locale}
          value={city || null}
          onChange={(v) => setCity(v ?? "")}
          options={CITIES.map((c) => ({ value: c.slug, label: c[locale] }))}
          placeholder={t("cityPlaceholder")}
          searchPlaceholder={tCommon("combobox.searchPlaceholder")}
          emptyText={tCommon("combobox.noResults")}
          allowClear
        />
      </div>

      {/* Specialty */}
      <div>
        <label
          htmlFor="specialty-select"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("specialtyLabel")}
        </label>
        <Combobox
          id="specialty-select"
          locale={locale}
          value={specialty || null}
          onChange={(v) => setSpecialty(v ?? "")}
          options={SPECIALTIES.map((s) => ({ value: s.slug, label: s[locale] }))}
          placeholder={t("specialtyPlaceholder")}
          searchPlaceholder={tCommon("combobox.searchPlaceholder")}
          emptyText={tCommon("combobox.noResults")}
          allowClear
        />
      </div>

      {error && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row-reverse sm:items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || isSkipping}
          className={`group flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3.5 text-sm font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
              <span>{t("submitting")}</span>
            </>
          ) : (
            <>
              <span>{t("submit")}</span>
              <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                →
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={isPending || isSkipping}
          className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-60 ${font}`}
        >
          {isSkipping ? <Loader2 size={14} className="animate-spin" /> : null}
          <span>{t("skip")}</span>
        </button>
      </div>
    </form>
  );
}
