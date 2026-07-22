"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient, updateClient } from "@/app/actions/clients/clients";
import { track } from "@/lib/analytics/track";
import { Loader2 } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";

type ClientFormData = {
  id?: string;
  name?: string;
  name_en?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  phone_whatsapp?: string;
  city?: string;
  client_type?: string;
  industry?: string;
  source?: string;
  source_detail?: string;
  tags?: string[];
  notes?: string;
  rating?: number;
};

type Props = {
  locale: "ar" | "en";
  mode: "create" | "edit";
  initialData?: ClientFormData;
  onSuccess?: () => void;
  /**
   * When provided (create mode), the newly-created client is returned here
   * instead of navigating to its page — used when the full form is embedded in
   * a popped dialog (e.g. the invoice builder's "+ Add client").
   */
  onCreated?: (client: { id: string; name: string }) => void;
  /** Drop the outer card chrome + header when rendered inside a dialog. */
  embedded?: boolean;
};

const CLIENT_TYPES = ["individual", "smb", "corporate", "government", "agency"] as const;
const CLIENT_SOURCES = ["referral", "platform", "social_media", "direct", "other"] as const;
const RATINGS = [1, 2, 3, 4, 5] as const;

export function ClientForm({ locale, mode, initialData, onSuccess, onCreated, embedded = false }: Props) {
  const t = useTranslations("Clients.form");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [name, setName] = useState(initialData?.name ?? "");
  const [nameEn, setNameEn] = useState(initialData?.name_en ?? "");
  const [company, setCompany] = useState(initialData?.company ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [phoneWa, setPhoneWa] = useState(initialData?.phone_whatsapp ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [clientType, setClientType] = useState(initialData?.client_type ?? "individual");
  const [industry, setIndustry] = useState(initialData?.industry ?? "");
  const [source, setSource] = useState(initialData?.source ?? "direct");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [rating, setRating] = useState<number | null>(initialData?.rating ?? null);
  const [tagsInput, setTagsInput] = useState((initialData?.tags ?? []).join(", "));

  const inputClass = `w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors placeholder:text-rizq-ink-soft/50 ${font}`;
  const labelClass = `block text-sm font-medium text-rizq-ink mb-2 ${font}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Embedded (via AddClientDialog) inside other forms like the invoice/gig
    // builders. Stop the submit bubbling through React portals to the parent
    // form, which would otherwise also submit.
    e.stopPropagation();
    if (!name.trim()) {
      setError(t("errors.nameRequired"));
      return;
    }
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (mode === "create") {
        const result = await createClient({
          name: name.trim(),
          name_en: nameEn.trim() || undefined,
          company: company.trim() || undefined,
          title: title.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          phone_whatsapp: phoneWa.trim() || undefined,
          city: city.trim() || undefined,
          client_type: clientType as "individual" | "smb" | "corporate" | "government" | "agency",
          industry: industry.trim() || undefined,
          source: source as "referral" | "platform" | "social_media" | "direct" | "other",
          tags,
          notes: notes.trim() || undefined,
          rating: rating ?? undefined,
        });

        if (!result.ok) {
          if (result.code === "quota_exhausted") {
            setShowUpgradeModal(true);
          } else {
            setError(t("errors.generic"));
          }
          return;
        }

        track("client_created", { locale });
        // Embedded in a dialog → return the new client to the caller; otherwise
        // navigate to its detail page as before.
        if (onCreated) {
          onCreated({ id: result.id, name: name.trim() });
        } else {
          router.push(`/clients/${result.id}` as `/clients/${string}`);
        }
      } else {
        if (!initialData?.id) return;
        const result = await updateClient({
          id: initialData.id,
          patch: {
            name: name.trim(),
            name_en: nameEn.trim() || undefined,
            company: company.trim() || undefined,
            title: title.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            phone_whatsapp: phoneWa.trim() || undefined,
            city: city.trim() || undefined,
            client_type: clientType as "individual" | "smb" | "corporate" | "government" | "agency",
            industry: industry.trim() || undefined,
            source: source as "referral" | "platform" | "social_media" | "direct" | "other",
            tags,
            notes: notes.trim() || undefined,
            rating: rating,
          },
        });

        if (!result.ok) {
          setError(t("errors.generic"));
          return;
        }

        track("client_updated", { locale });
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <>
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
        reason="clients"
      />
    <form
      onSubmit={handleSubmit}
      method="post"
      dir={dir}
      className={
        embedded
          ? `space-y-5 ${font}`
          : `rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-5 animate-fade-in ${font}`
      }
      noValidate
    >
      {!embedded && (
        <div>
          <p className="eyebrow mb-1 text-rizq-green">{mode === "create" ? t("addTitle") : t("editTitle")}</p>
        </div>
      )}

      {/* Name (required) */}
      <div>
        <label className={labelClass}>{t("nameLabel")} <span className="text-red-500">*</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} className={inputClass} />
      </div>

      {/* Name EN */}
      <div>
        <label className={labelClass}>{t("nameEnLabel")} <span className={`ms-1 text-rizq-ink-soft/60 font-normal`}>({t("optional")})</span></label>
        <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={t("nameEnPlaceholder")} className={`${inputClass} font-sans`} dir="ltr" />
      </div>

      {/* Company + Title row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("companyLabel")}</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("companyPlaceholder")} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{t("titleLabel")}</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} className={inputClass} />
        </div>
      </div>

      {/* Phone + WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("phoneLabel")}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} className={`${inputClass} font-sans`} dir="ltr" />
        </div>
        <div>
          <label className={labelClass}>{t("phoneWaLabel")}</label>
          <input type="tel" value={phoneWa} onChange={(e) => setPhoneWa(e.target.value)} placeholder={t("phoneWaPlaceholder")} className={`${inputClass} font-sans`} dir="ltr" />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className={labelClass}>{t("emailLabel")}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} className={`${inputClass} font-sans`} dir="ltr" />
      </div>

      {/* City */}
      <div>
        <label className={labelClass}>{t("cityLabel")}</label>
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("cityPlaceholder")} className={inputClass} />
      </div>

      {/* Client type */}
      <div>
        <label className={labelClass}>{t("clientTypeLabel")}</label>
        <select aria-label={t("clientTypeLabel")} value={clientType} onChange={(e) => setClientType(e.target.value)} className={`${inputClass} appearance-none`}>
          {CLIENT_TYPES.map((ct) => (
            <option key={ct} value={ct}>{t(`clientType_${ct}`)}</option>
          ))}
        </select>
      </div>

      {/* Source */}
      <div>
        <label className={labelClass}>{t("sourceLabel")}</label>
        <select aria-label={t("sourceLabel")} value={source} onChange={(e) => setSource(e.target.value)} className={`${inputClass} appearance-none`}>
          {CLIENT_SOURCES.map((s) => (
            <option key={s} value={s}>{t(`source_${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Industry */}
      <div>
        <label className={labelClass}>{t("industryLabel")}</label>
        <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={t("industryPlaceholder")} className={inputClass} />
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>{t("tagsLabel")}</label>
        <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={t("tagsPlaceholder")} className={inputClass} />
        <p className={`text-xs text-rizq-ink-soft/60 mt-1 ${font}`}>{t("tagsHint")}</p>
      </div>

      {/* Rating */}
      <div>
        <label className={labelClass}>{t("ratingLabel")}</label>
        <div className="flex gap-2" dir="ltr">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRating(rating === r ? null : r)}
              className={`text-2xl transition-colors ${rating && r <= rating ? "text-rizq-gold" : "text-rizq-gold/30 hover:text-rizq-gold/60"}`}
              aria-label={`${r} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>{t("notesLabel")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={t("notesPlaceholder")}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Error */}
      {error && <p role="alert" className={`text-sm text-red-700 ${font}`}>{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? (
          <><Loader2 size={18} className="animate-spin" strokeWidth={2.2} /><span>{t("saving")}</span></>
        ) : (
          <><span>{mode === "create" ? t("save") : t("saveChanges")}</span><span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">→</span></>
        )}
      </button>
    </form>
    </>
  );
}
