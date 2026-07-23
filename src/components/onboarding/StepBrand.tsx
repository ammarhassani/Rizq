"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Mail, Phone, MapPin, Image as ImageIcon } from "lucide-react";
import { saveOnboardingStep } from "@/app/actions/onboarding/saveOnboardingStep";
import { suggestBrandKitAction } from "@/app/actions/onboarding/suggestBrandKitAction";
import type { StepProps } from "./types";
import { useAutosave } from "./useAutosave";

// Real WhatsApp brand glyph (lucide ships no brand logos, so inline the official path).
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.005c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411" />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Saudi mobile national number: 9 digits starting with 5 (e.g. 5XXXXXXXX).
const KSA_MOBILE_RE = /^5\d{8}$/;

/** Reduce any stored/typed phone to the 9-digit national number (drop +966 / 0). */
function toNationalPhone(raw: string | null | undefined): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("966")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(-9);
}

export function StepBrand({ locale, profile, onNext, onBack, onSkip, autosave, onSaveError }: StepProps) {
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
  // Phone / WhatsApp held as the 9-digit national number; +966 is a fixed prefix.
  const [contactPhone, setContactPhone] = useState(toNationalPhone(profile.contact_phone));
  const [contactWhatsapp, setContactWhatsapp] = useState(toNationalPhone(profile.contact_whatsapp));
  const [waSameAsPhone, setWaSameAsPhone] = useState(() => {
    const p = toNationalPhone(profile.contact_phone);
    return p !== "" && p === toNationalPhone(profile.contact_whatsapp);
  });
  const [contactCity, setContactCity] = useState(profile.contact_city ?? "");
  const [logoUrl, setLogoUrl] = useState(profile.logo_url ?? "");
  const [logoBroken, setLogoBroken] = useState(false);

  // Validation — all optional, but must be well-formed if filled.
  const emailValid = contactEmail === "" || EMAIL_RE.test(contactEmail);
  const phoneValid = contactPhone === "" || KSA_MOBILE_RE.test(contactPhone);
  const waValid = waSameAsPhone || contactWhatsapp === "" || KSA_MOBILE_RE.test(contactWhatsapp);

  const [aiError, setAiError] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [isAiPending, startAiTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls = `w-full rounded-xl border border-[#8f7e48] bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors ${font}`;
  const labelCls = `block text-sm font-medium text-rizq-ink mb-1.5 ${font}`;

  // Generate the whole identity (name + tagline + bio) from earlier steps and
  // fill the fields — the freelancer reviews/edits before saving.
  const handleGenerate = () => {
    setAiError(false);
    setAiFilled(false);
    startAiTransition(async () => {
      const kit = await suggestBrandKitAction(locale);
      if (kit) {
        setBrandName(kit.brand_name);
        setTagline(kit.tagline);
        setBio(kit.bio);
        setAiFilled(true);
      } else {
        setAiError(true);
      }
    });
  };

  const handleSave = () => {
    setError(null);
    if (!emailValid || !phoneValid || !waValid) {
      setError(isAr ? "تحقّق من البريد أو رقم الجوال." : "Check your email or phone number.");
      return;
    }
    const fullPhone = contactPhone ? `+966${contactPhone}` : null;
    const fullWa = waSameAsPhone ? fullPhone : contactWhatsapp ? `+966${contactWhatsapp}` : null;
    startTransition(async () => {
      const result = await saveOnboardingStep("brand", {
        // Single fields mirrored to both language columns.
        brand_name: brandName || null,
        brand_name_ar: brandName || null,
        tagline_ar: tagline || null,
        tagline_en: tagline || null,
        bio_ar: bio || null,
        bio_en: bio || null,
        logo_url: logoUrl.trim() || null,
        contact_email: contactEmail || "",
        contact_phone: fullPhone,
        contact_whatsapp: fullWa,
        contact_city: contactCity || null,
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
    brandName,
    tagline,
    bio,
    logoUrl,
    contactEmail,
    contactPhone,
    contactWhatsapp,
    waSameAsPhone,
    contactCity,
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
      {/* AI: write my whole identity from the earlier steps */}
      <div className="rounded-2xl border border-rizq-green/20 bg-rizq-green/[0.03] p-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className={`text-sm font-medium text-rizq-ink ${font}`}>
              {isAr ? "دع رِزق يكتب هويتك" : "Let Rizq write your identity"}
            </p>
            <p className={`text-xs text-rizq-ink-soft ${font}`}>
              {isAr
                ? "اسم وشعار ونبذة — من تخصصك ومدينتك وخبرتك. راجعها وعدّلها."
                : "Name, tagline & bio — from your specialty, city & experience. Review and edit."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isAiPending}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-4 py-2 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-60 ${font}`}
          >
            {isAiPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{isAr ? "يكتب…" : "Writing…"}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>
                  {aiFilled
                    ? isAr
                      ? "أعد التوليد"
                      : "Regenerate"
                    : isAr
                      ? "اكتب هويتي"
                      : "Write my identity"}
                </span>
              </>
            )}
          </button>
        </div>
        {aiFilled && (
          <p className={`text-xs text-rizq-green ${font}`}>
            {isAr ? "✦ اقتراح ذكاء اصطناعي — عدّله كما تشاء." : "✦ AI suggestion — edit it freely."}
          </p>
        )}
        {aiError && (
          <p className={`text-xs text-[var(--over)] ${font}`}>
            {isAr ? "تعذّر التوليد. حاول مرة أخرى." : "Couldn't generate. Try again."}
          </p>
        )}
      </div>

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
          className="rounded-2xl border border-rizq-gold/30 bg-[var(--raised)] overflow-hidden"
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

      {/* Tagline */}
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

      {/* Logo — paste an image link; live preview. (Real file upload needs a public bucket.) */}
      <div>
        <label className={labelCls}>{isAr ? "شعارك" : "Your logo"}</label>
        <div className="flex items-center gap-3">
          {logoUrl.trim() && !logoBroken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={isAr ? "معاينة الشعار" : "Logo preview"}
              onError={() => setLogoBroken(true)}
              className="h-14 w-14 shrink-0 rounded-xl border border-rizq-gold/25 bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-rizq-gold/40 bg-rizq-cream/40">
              <ImageIcon size={20} className="text-rizq-ink-soft/50" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                setLogoBroken(false);
              }}
              placeholder={isAr ? "الصق رابط صورة الشعار (https://…)" : "Paste a logo image link (https://…)"}
              className={`${inputCls} font-sans`}
              dir="ltr"
            />
            <p className={`mt-1 text-xs text-rizq-ink-soft/70 ${font}`}>
              {logoBroken
                ? isAr
                  ? "تعذّر تحميل الصورة — تحقّق من الرابط."
                  : "Couldn't load that image — check the link."
                : isAr
                  ? "يظهر على عروضك وفواتيرك."
                  : "Shown on your proposals & invoices."}
            </p>
          </div>
        </div>
      </div>

      {/* Contact — each field branded with its icon */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t("contactEmail")}</label>
          <div className="relative" dir="ltr">
            <Mail size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-rizq-ink-soft/70" />
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${inputCls} ps-11 ${emailValid ? "" : "!border-[var(--over-line)]"}`}
              maxLength={200}
              dir="ltr"
              aria-invalid={!emailValid}
            />
          </div>
          {!emailValid && (
            <p className={`mt-1 text-xs text-[var(--over)] ${font}`}>
              {isAr ? "بريد إلكتروني غير صحيح." : "Enter a valid email."}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>{t("contactPhone")}</label>
          <div
            dir="ltr"
            className={`flex items-stretch overflow-hidden rounded-xl border bg-rizq-cream/60 transition-colors focus-within:ring-2 focus-within:ring-rizq-green/40 ${
              phoneValid ? "border-[#8f7e48] focus-within:border-rizq-green" : "border-[var(--over-line)]"
            }`}
          >
            <span className="flex items-center gap-1.5 border-e border-[#8f7e48] px-3 text-sm text-rizq-ink-soft select-none">
              <Phone size={15} />
              +966
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="5XXXXXXXX"
              className="flex-1 min-w-0 bg-transparent px-3 py-3 text-base text-rizq-ink tabular focus:outline-none"
              dir="ltr"
              aria-invalid={!phoneValid}
            />
          </div>
          {!phoneValid && (
            <p className={`mt-1 text-xs text-[var(--over)] ${font}`}>
              {isAr ? "جوال سعودي غير صحيح (٩ أرقام تبدأ بـ ٥)." : "Enter a valid Saudi mobile (9 digits, starts with 5)."}
            </p>
          )}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className={`text-sm font-medium text-rizq-ink ${font}`}>{t("contactWhatsapp")}</span>
            <label className={`flex cursor-pointer items-center gap-1.5 text-xs text-rizq-ink-soft ${font}`}>
              <input
                type="checkbox"
                checked={waSameAsPhone}
                onChange={(e) => setWaSameAsPhone(e.target.checked)}
                className="h-3.5 w-3.5 accent-rizq-green"
              />
              {isAr ? "نفس رقم الجوال" : "Same as phone"}
            </label>
          </div>
          <div
            dir="ltr"
            className={`flex items-stretch overflow-hidden rounded-xl border bg-rizq-cream/60 transition-colors focus-within:ring-2 focus-within:ring-rizq-green/40 ${
              waSameAsPhone ? "opacity-60" : ""
            } ${waValid ? "border-[#8f7e48] focus-within:border-rizq-green" : "border-[var(--over-line)]"}`}
          >
            <span className="flex items-center gap-1.5 border-e border-[#8f7e48] px-3 text-sm text-rizq-ink-soft select-none">
              <WhatsappIcon className="h-4 w-4 text-[#25D366]" />
              +966
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={waSameAsPhone ? contactPhone : contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 9))}
              disabled={waSameAsPhone}
              placeholder="5XXXXXXXX"
              className="flex-1 min-w-0 bg-transparent px-3 py-3 text-base text-rizq-ink tabular focus:outline-none disabled:cursor-not-allowed"
              dir="ltr"
              aria-invalid={!waValid}
            />
          </div>
          {!waValid && (
            <p className={`mt-1 text-xs text-[var(--over)] ${font}`}>
              {isAr ? "جوال سعودي غير صحيح." : "Enter a valid Saudi mobile."}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>{t("contactCity")}</label>
          <div className="relative">
            <MapPin size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-rizq-ink-soft/70" />
            <input
              type="text"
              value={contactCity}
              onChange={(e) => setContactCity(e.target.value)}
              className={`${inputCls} ps-11`}
              maxLength={80}
            />
          </div>
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
