"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { suggestTaglinesAction } from "@/app/actions/onboarding/suggestTaglinesAction";
import type { StepProps } from "./types";

export function StepBrand({ locale, profile, onNext, onBack, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.brand");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  // One field each — no per-language duplication. Type in any language; we mirror
  // to both language columns on save so every artifact resolves it.
  const [brandName, setBrandName] = useState(profile.brand_name ?? profile.brand_name_ar ?? "");
  const [tagline, setTagline] = useState(profile.tagline_ar ?? profile.tagline_en ?? "");
  const [bio, setBio] = useState(profile.bio_ar ?? profile.bio_en ?? "");
  const [contactEmail, setContactEmail] = useState(profile.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(profile.contact_phone ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(profile.contact_whatsapp ?? "");
  const [contactCity, setContactCity] = useState(profile.contact_city ?? "");

  const [taglineSuggestions, setTaglineSuggestions] = useState<string[] | null>(null);
  const [taglineError, setTaglineError] = useState(false);
  const [isAiPending, startAiTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  const handleAiTagline = () => {
    setTaglineError(false);
    setTaglineSuggestions(null);
    startAiTransition(async () => {
      const result = await suggestTaglinesAction(locale);
      if (result) {
        setTaglineSuggestions(result.taglines);
      } else {
        setTaglineError(true);
      }
    });
  };

  const applyTagline = (suggestion: string) => {
    setTagline(suggestion);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingStep("brand", {
        // Single fields mirrored to both language columns.
        brand_name: brandName || null,
        brand_name_ar: brandName || null,
        tagline_ar: tagline || null,
        tagline_en: tagline || null,
        bio_ar: bio || null,
        bio_en: bio || null,
        contact_email: contactEmail || "",
        contact_phone: contactPhone || null,
        contact_whatsapp: contactWhatsapp || null,
        contact_city: contactCity || null,
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
      className={`space-y-5 ${font}`}
    >
      <div>
        <label className={labelCls}>{isAr ? "اسم علامتك التجارية" : "Brand name"}</label>
        <input
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder={isAr ? "مثال: استوديو التصميم" : "e.g. DesignStudio"}
          className={inputCls}
          maxLength={120}
          dir="auto"
        />
      </div>

      {/* Live, ephemeral brand preview (feature 006) — the freelancer sees their
          identity on a proposal header in real time. Nothing is persisted here. */}
      {(brandName || tagline) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-rizq-gold/30 bg-white/70 overflow-hidden"
        >
          <div className="h-1.5 bg-gradient-to-r from-rizq-green to-rizq-gold" />
          <div className="p-4">
            <p className={`text-[10px] uppercase tracking-wide text-rizq-ink-soft/60 mb-2 ${font}`}>
              {isAr ? "معاينة حية لعرضك" : "Live preview of your proposal"}
            </p>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-base font-bold text-rizq-green ${font}`} dir="auto">
                {brandName || (isAr ? "اسمك التجاري" : "Your brand")}
              </span>
              <span className={`text-[11px] text-rizq-ink-soft ${font}`}>
                {isAr ? "عرض سعر" : "Proposal"}
              </span>
            </div>
            {tagline && (
              <p className={`text-xs text-rizq-ink-soft mt-0.5 ${font}`} dir="auto">
                {tagline}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Tagline + AI section */}
      <div className="space-y-3">
        <div>
          <label className={labelCls}>{isAr ? "الشعار (Tagline)" : "Tagline"}</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder={isAr ? "مثال: تصميم يعكس هويتك" : "e.g. Design that reflects you"}
            className={inputCls}
            maxLength={200}
            dir="auto"
          />
        </div>

        {/* AI tagline button */}
        <div className="rounded-xl border border-rizq-gold/30 bg-rizq-cream/40 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("aiTaglineTitle")}</p>
              <p className={`text-xs text-rizq-ink-soft ${font}`}>{t("aiTaglineSubtitle")}</p>
            </div>
            <button
              type="button"
              onClick={handleAiTagline}
              disabled={isAiPending}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/50 bg-rizq-cream px-4 py-2 text-sm text-rizq-green hover:bg-rizq-green/5 transition-colors disabled:opacity-60 ${font}`}
            >
              {isAiPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t("aiTaglineGenerating")}</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>{t("aiTaglineGenerate")}</span>
                </>
              )}
            </button>
          </div>

          {taglineError && (
            <p className={`text-xs text-red-600 ${font}`}>{t("aiTaglineError")}</p>
          )}

          {taglineSuggestions && (
            <div className="space-y-2">
              <p className={`text-xs text-rizq-ink-soft ${font}`}>{t("aiTaglineDisclaimer")}</p>
              {taglineSuggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-lg border border-rizq-gold/20 bg-white/60 p-3"
                >
                  <p className={`text-sm text-rizq-ink ${font}`} dir="auto">
                    {s}
                  </p>
                  <button
                    type="button"
                    onClick={() => applyTagline(s)}
                    className={`shrink-0 text-xs text-rizq-green hover:underline ${font}`}
                  >
                    {t("aiTaglineUse")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio — single field */}
      <div>
        <label className={labelCls}>{isAr ? "نبذة عنك" : "Short bio"}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={isAr ? "سطران عن خبرتك وما يميّزك" : "A line or two about your experience and what sets you apart"}
          className={`${inputCls} resize-none h-24`}
          maxLength={1000}
          dir="auto"
        />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("contactEmail")}</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputCls}
            maxLength={200}
            dir="ltr"
          />
        </div>
        <div>
          <label className={labelCls}>{t("contactPhone")}</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={inputCls}
            maxLength={30}
            dir="ltr"
          />
        </div>
        <div>
          <label className={labelCls}>{t("contactWhatsapp")}</label>
          <input
            type="tel"
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            className={inputCls}
            maxLength={30}
            dir="ltr"
          />
        </div>
        <div>
          <label className={labelCls}>{t("contactCity")}</label>
          <input
            type="text"
            value={contactCity}
            onChange={(e) => setContactCity(e.target.value)}
            className={inputCls}
            maxLength={80}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {error}
        </p>
      )}

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
    </motion.div>
  );
}
