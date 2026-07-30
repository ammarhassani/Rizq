"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStepSafely as saveOnboardingStep } from "@/lib/onboarding/saveStep";
import { Link } from "@/i18n/navigation";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";

export function StepIdentity({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.identity");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [fullName, setFullName] = useState(profile.full_name_ar ?? profile.full_name_en ?? "");
  // FL number: the "FL" prefix is a fixed chip; we store only the digits the user types.
  const [flDigits, setFlDigits] = useState((profile.fl_number ?? "").replace(/\D/g, ""));
  // VAT: the schema and the invoice builder have always read these; there was simply
  // no input anywhere, so every invoice was silently non-VAT with no way to change it.
  const [vatRegistered, setVatRegistered] = useState(Boolean(profile.vat_registered));
  const [vatNumber, setVatNumber] = useState((profile.vat_number ?? "").replace(/\D/g, ""));
  const [error, setError] = useState<string | null>(null);

  // Optional, but if provided it must be 5–12 digits.
  const flValid = flDigits === "" || /^\d{5,12}$/.test(flDigits);
  // A Saudi VAT number is exactly 15 digits. Only enforced once they say they're registered.
  const vatValid = !vatRegistered || vatNumber === "" || /^\d{15}$/.test(vatNumber);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleSave = () => {
    setError(null);
    if (!flValid) {
      setError(t("documentNumberMustBe5"));
      return;
    }
    if (!vatValid) {
      setError(isAr ? "الرقم الضريبي ١٥ رقمًا." : "A VAT number is 15 digits.");
      return;
    }
    startTransition(async () => {
      const result = await saveOnboardingStep("identity", {
        // One name field — mirror to both columns so AR + EN artifacts both resolve it.
        full_name_ar: fullName || null,
        full_name_en: fullName || null,
        // Persist canonically with the FL prefix; the input only holds digits.
        fl_number: flDigits ? `FL-${flDigits}` : null,
        vat_registered: vatRegistered,
        vat_number: vatRegistered && vatNumber ? vatNumber : null,
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
  useAutosave(!!autosave, handleSave, [fullName, flDigits, vatRegistered, vatNumber]);

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 ${font}`}
    >
      {/* Full name — single field, direction follows what they type */}
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("fullName")}</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("asId")}
          className={inputCls}
          maxLength={120}
          dir="auto"
        />
      </div>

      {/* FL Number — fixed "FL" chip + digits-only input */}
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("flNumber")}</label>
        <div
          dir="ltr"
          className={`flex items-stretch overflow-hidden rounded-xl border bg-rizq-cream/60 transition-colors focus-within:ring-2 focus-within:ring-rizq-green/40 ${
            flValid ? "border-[#8f7e48] focus-within:border-rizq-green" : "border-[var(--over-line)]"
          }`}
        >
          <span className="flex items-center px-3.5 bg-rizq-green/10 text-rizq-green font-semibold text-sm border-e border-[#8f7e48] select-none">
            FL
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={flDigits}
            onChange={(e) => setFlDigits(e.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="XXXXXXXX"
            className="flex-1 bg-transparent px-3 py-3 text-base text-rizq-ink tabular focus:outline-none"
            aria-invalid={!flValid}
            aria-label={t("flNumber")}
          />
        </div>
        <p className={`mt-1 text-xs ${flValid ? "text-rizq-ink-soft" : "text-[var(--over)]"}`}>
          {flValid
            ? t("flNumberHint")
            : isAr
              ? "أرقام فقط (٥–١٢ خانة)."
              : "Digits only (5–12)."}
        </p>
      </div>

      {/* VAT — drives the 15% line on every invoice (createInvoiceFromGig). */}
      <div className="sm:col-span-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={vatRegistered}
            onChange={(e) => setVatRegistered(e.target.checked)}
            className="h-4 w-4 rounded border-[#8f7e48] accent-rizq-green"
          />
          <span className={`text-sm text-rizq-ink ${font}`}>{t("vatRegistered")}</span>
        </label>
        {vatRegistered && (
          <div className="mt-3">
            <label className={labelCls} htmlFor="vat-number">
              {t("vatNumber")}
            </label>
            <input
              id="vat-number"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, "").slice(0, 15))}
              placeholder={t("vatNumberPlaceholder")}
              aria-invalid={!vatValid}
              className={`${inputCls} tabular`}
            />
            <p className={`mt-1 text-xs ${vatValid ? "text-rizq-ink-soft" : "text-[var(--over)]"} ${font}`}>
              {isAr
                ? "يظهر على فواتيرك مع ضريبة ١٥٪."
                : "Shown on your invoices alongside 15% VAT."}
            </p>
          </div>
        )}
      </div>

      {/* Official documents live in the vault — it accepts uploads today. */}
      <div className="sm:col-span-2 rounded-xl border border-dashed border-rizq-gold/40 bg-rizq-cream/40 px-4 py-3">
        <p className={`text-sm text-rizq-ink-soft ${font}`}>
          {isAr ? (
            <>
              ارفع وثيقة العمل الحر وغيرها في{" "}
              <Link href="/documents" className="text-rizq-green underline underline-offset-2">
                خزنة الوثائق
              </Link>
              .
            </>
          ) : (
            <>
              Upload your freelance permit and other papers in the{" "}
              <Link href="/documents" className="text-rizq-green underline underline-offset-2">
                document vault
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {error && (
        <p role="alert" className={`sm:col-span-2 text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
      {autosave ? (
        isPending && (
          <p className={`flex items-center gap-2 text-xs text-rizq-ink-soft ${font}`}>
            <Loader2 size={13} className="animate-spin" />
            {tv2("saving")}
          </p>
        )
      ) : (
        <StepNav
          locale={locale}
          onBack={onBack}
          onSkip={onSkip}
          onSave={handleSave}
          isPending={isPending}
          skippable
        />
      )}
      </div>
    </motion.div>
  );
}

// ── Shared navigation bar for all steps ─────────────────────────────────────
export function StepNav({
  locale,
  onBack,
  onSkip,
  onSave,
  isPending,
  skippable,
  isFirstStep = false,
}: {
  locale: "ar" | "en";
  onBack: () => void;
  onSkip: () => void;
  onSave: () => void;
  isPending: boolean;
  skippable: boolean;
  isFirstStep?: boolean;
}) {
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <div className={`flex items-center justify-between gap-3 pt-2 ${font}`}>
      {!isFirstStep && (
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
        >
          {tv2("back")}
        </button>
      )}
      <div className={`flex items-center gap-3 ${isFirstStep ? "w-full justify-end" : "ms-auto"}`}>
        {skippable && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isPending}
            className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
          >
            {tv2("skipStep")}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
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
  );
}
