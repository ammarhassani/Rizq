"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import type { StepProps } from "./types";

export function StepIdentity({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.identity");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [fullName, setFullName] = useState(profile.full_name_ar ?? profile.full_name_en ?? "");
  const [flNumber, setFlNumber] = useState(profile.fl_number ?? "");
  const [vatRegistered, setVatRegistered] = useState(profile.vat_registered ?? false);
  const [vatNumber, setVatNumber] = useState(profile.vat_number ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("identity", {
        // One name field — mirror to both columns so AR + EN artifacts both resolve it.
        full_name_ar: fullName || null,
        full_name_en: fullName || null,
        fl_number: flNumber || null,
        vat_registered: vatRegistered,
        vat_number: vatNumber || null,
      });
      if (result.ok) {
        onNext(result.completeness);
      } else {
        setError(tv2("errorSave"));
      }
    });
  };

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
        <label className={labelCls}>{isAr ? "الاسم الكامل" : "Full name"}</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={isAr ? "كما في هويتك" : "As on your ID"}
          className={inputCls}
          maxLength={120}
          dir="auto"
        />
      </div>

      {/* FL Number */}
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("flNumber")}</label>
        <input
          type="text"
          value={flNumber}
          onChange={(e) => setFlNumber(e.target.value)}
          placeholder={t("flNumberPlaceholder")}
          className={inputCls}
          maxLength={40}
          dir="ltr"
        />
        <p className="mt-1 text-xs text-rizq-ink-soft">{t("flNumberHint")}</p>
      </div>

      {/* FL Document upload — DEFERRED */}
      <div className="sm:col-span-2 rounded-xl border border-dashed border-rizq-gold/40 bg-rizq-cream/40 px-4 py-3">
        <p className="text-sm text-rizq-ink-soft">{t("flUploadDeferred")}</p>
      </div>

      {/* VAT */}
      <div className="sm:col-span-2 flex items-center gap-3">
        <input
          id="vat-check"
          type="checkbox"
          checked={vatRegistered}
          onChange={(e) => setVatRegistered(e.target.checked)}
          className="w-4 h-4 accent-rizq-green"
        />
        <label htmlFor="vat-check" className={`text-sm text-rizq-ink ${font}`}>
          {t("vatRegistered")}
        </label>
      </div>
      {vatRegistered && (
        <div className="sm:col-span-2">
          <label className={labelCls}>{t("vatNumber")}</label>
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder={t("vatNumberPlaceholder")}
            className={inputCls}
            maxLength={20}
            dir="ltr"
          />
        </div>
      )}

      {error && (
        <p role="alert" className={`sm:col-span-2 text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
      <StepNav
        locale={locale}
        onBack={onBack}
        onSkip={onSkip}
        onSave={handleSave}
        isPending={isPending}
        skippable
      />
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
