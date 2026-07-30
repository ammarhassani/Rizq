"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStepSafely as saveOnboardingStep } from "@/lib/onboarding/saveStep";
import { NumberStepper } from "./NumberStepper";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";

export function StepDefaults({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.defaults");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [depositPct, setDepositPct] = useState(profile.default_deposit_pct?.toString() ?? "50");
  const [revisions, setRevisions] = useState(profile.default_revisions?.toString() ?? "2");
  const [ipTerms, setIpTerms] = useState<"full_transfer" | "license" | "per_project">(
    profile.default_ip_terms ?? "full_transfer"
  );
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "stc_pay" | "cash" | "other">(
    profile.default_payment_method ?? "bank_transfer"
  );
  const [paymentDetails, setPaymentDetails] = useState(profile.default_payment_details ?? "");
  const [warrantyDays, setWarrantyDays] = useState(
    profile.default_warranty_days?.toString() ?? "0"
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const ipOptions: Array<{ value: "full_transfer" | "license" | "per_project"; label: string }> = [
    { value: "full_transfer", label: t("ipTermsFullTransfer") },
    { value: "license", label: t("ipTermsLicense") },
    { value: "per_project", label: t("ipTermsPerProject") },
  ];

  const paymentOptions: Array<{ value: "bank_transfer" | "stc_pay" | "cash" | "other"; label: string }> = [
    { value: "bank_transfer", label: t("paymentMethodBankTransfer") },
    { value: "stc_pay", label: t("paymentMethodStcPay") },
    { value: "cash", label: t("paymentMethodCash") },
    { value: "other", label: t("paymentMethodOther") },
  ];

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("defaults", {
        default_deposit_pct: parseInt(depositPct, 10),
        default_revisions: parseInt(revisions, 10),
        default_ip_terms: ipTerms,
        default_payment_method: paymentMethod,
        default_payment_details: paymentDetails || null,
        default_warranty_days: parseInt(warrantyDays, 10),
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
  useAutosave(!!autosave, handleSave, [
    depositPct,
    revisions,
    ipTerms,
    paymentMethod,
    paymentDetails,
    warrantyDays,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`space-y-5 ${font}`}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            {t("depositPct")}
            <span className="text-xs text-rizq-ink-soft ms-1">{t("depositPctHint")}</span>
          </label>
          <NumberStepper
            locale={locale}
            value={depositPct}
            onChange={setDepositPct}
            min={0}
            max={100}
            step={5}
            maxDigits={3}
            ariaLabel={t("depositPct")}
          />
        </div>
        <div>
          <label className={labelCls}>{t("revisions")}</label>
          <NumberStepper
            locale={locale}
            value={revisions}
            onChange={setRevisions}
            min={0}
            max={50}
            step={1}
            maxDigits={2}
            ariaLabel={t("revisions")}
          />
        </div>
      </div>

      {/* IP Terms pills */}
      <div>
        <p className={labelCls}>{t("ipTerms")}</p>
        <div className="flex flex-wrap gap-2">
          {ipOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIpTerms(opt.value)}
              aria-pressed={ipTerms === opt.value}
              className={`rounded-2xl border px-4 py-2 text-sm transition-all ${
                ipTerms === opt.value
                  ? "border-rizq-green bg-rizq-green/10 text-rizq-green"
                  : "border-[#8f7e48] bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment method pills */}
      <div>
        <p className={labelCls}>{t("paymentMethod")}</p>
        <div className="flex flex-wrap gap-2">
          {paymentOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentMethod(opt.value)}
              aria-pressed={paymentMethod === opt.value}
              className={`rounded-2xl border px-4 py-2 text-sm transition-all ${
                paymentMethod === opt.value
                  ? "border-rizq-green bg-rizq-green/10 text-rizq-green"
                  : "border-[#8f7e48] bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40"
              } ${font}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
      {/* Payment details */}
      <div>
        <label className={labelCls}>{t("paymentDetails")}</label>
        <input
          type="text"
          value={paymentDetails}
          onChange={(e) => setPaymentDetails(e.target.value)}
          placeholder={t("paymentDetailsPlaceholder")}
          className={inputCls}
          maxLength={500}
          dir="ltr"
        />
      </div>

      {/* Warranty days */}
      <div>
        <label className={labelCls}>
          {t("warrantyDays")}
          <span className="text-xs text-rizq-ink-soft ms-1">{t("warrantyDaysHint")}</span>
        </label>
        <NumberStepper
          locale={locale}
          value={warrantyDays}
          onChange={setWarrantyDays}
          min={0}
          max={365}
          step={1}
          maxDigits={3}
          ariaLabel={t("warrantyDays")}
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
