"use client";

import { useState, useTransition } from "react";
import { useForm, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Check, Loader2, MessageCircle, Paperclip, X } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { submitPricing } from "@/app/actions/submit/submitPricing";
import { resubmitPricing } from "@/app/actions/submit/resubmitPricing";
import { Combobox } from "@/components/ui/Combobox";

type Option = { slug: string; label: string };

export type SubmitPrefill = {
  submission_id: string;
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
  project_type: string;
  project_size: "" | "small" | "medium" | "large" | "enterprise";
  price_sar: number;
  project_duration_days: number | "";
  client_type:
    | ""
    | "individual"
    | "smb"
    | "corporate"
    | "government"
    | "other";
  notes: string;
  moderator_notes: string | null;
};

type Props = {
  locale: "ar" | "en";
  userId: string;
  specialties: Option[];
  cities: Option[];
  tiers: Option[];
  /** When present, the form runs in "resubmit" mode against this submission. */
  prefill?: SubmitPrefill;
};

type FormValues = {
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
  project_type?: string;
  project_size?: string;
  price_sar: number;
  project_duration_days?: number | "";
  client_type?: string;
  notes?: string;
};

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export function SubmitForm({
  locale,
  userId,
  specialties,
  cities,
  tiers,
  prefill,
}: Props) {
  const t = useTranslations("Submit");
  const tResubmit = useTranslations("Resubmit");
  const tCommon = useTranslations("Common");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const router = useRouter();
  const isResubmit = !!prefill;

  const schema = z.object({
    specialty_slug: z.string().min(1, { message: t("errors.required") }),
    city_slug: z.string().min(1, { message: t("errors.required") }),
    experience_tier_slug: z.string().min(1, { message: t("errors.required") }),
    project_type: z.string().max(120).optional().default(""),
    project_size: z.string().optional().default(""),
    price_sar: z
      .number({ message: t("errors.required") })
      .min(1, { message: t("errors.priceRange") })
      .max(1_000_000, { message: t("errors.priceRange") }),
    project_duration_days: z
      .union([z.number().int().min(0).max(3650), z.literal("")])
      .optional(),
    client_type: z.string().optional().default(""),
    notes: z.string().max(2000).optional().default(""),
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: prefill
      ? {
          specialty_slug: prefill.specialty_slug,
          city_slug: prefill.city_slug,
          experience_tier_slug: prefill.experience_tier_slug,
          project_type: prefill.project_type,
          project_size: prefill.project_size,
          price_sar: prefill.price_sar,
          project_duration_days: prefill.project_duration_days,
          client_type: prefill.client_type,
          notes: prefill.notes,
        }
      : {
          specialty_slug: "",
          city_slug: "",
          experience_tier_slug: "",
          project_type: "",
          project_size: "",
          price_sar: 0,
          project_duration_days: "",
          client_type: "",
          notes: "",
        },
  });

  const [isPending, startTransition] = useTransition();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setProofFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(t("errors.fileTooLarge"));
      setProofFile(null);
      e.target.value = "";
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError(t("errors.fileType"));
      setProofFile(null);
      e.target.value = "";
      return;
    }
    setProofFile(file);
  };

  const onSubmit = (values: FormValues) => {
    setUploadError(null);
    startTransition(async () => {
      const supabase = createBrowserClient();
      let proofUrl: string | null = null;

      if (proofFile) {
        // Upload to private bucket. Path: {user_id}/{random}.{ext}
        const ext = proofFile.name.split(".").pop() ?? "bin";
        const random = crypto.randomUUID();
        const path = `${userId}/${random}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("submission-proofs")
          .upload(path, proofFile, {
            contentType: proofFile.type,
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadErr) {
          setUploadError(t("errors.uploadFailed"));
          return;
        }
        proofUrl = path;
      }

      const payload = {
        specialty_slug: values.specialty_slug,
        city_slug: values.city_slug,
        experience_tier_slug: values.experience_tier_slug,
        project_type: values.project_type || null,
        project_size: values.project_size || null,
        price_sar: Number(values.price_sar),
        project_duration_days:
          values.project_duration_days === "" ||
          values.project_duration_days === undefined
            ? null
            : Number(values.project_duration_days),
        client_type: values.client_type || null,
        notes: values.notes || null,
        proof_url: proofUrl,
      };

      const result = isResubmit
        ? await resubmitPricing({
            submission_id: prefill!.submission_id,
            ...payload,
          })
        : await submitPricing(payload);

      if (result.ok) {
        setSuccess(true);
        if (!isResubmit) {
          reset();
          setProofFile(null);
        }
        router.refresh();
        return;
      }

      // Server action failed — if we uploaded a proof for this attempt,
      // clean it up so we don't leave an orphan in storage.
      if (proofUrl) {
        try {
          await supabase.storage
            .from("submission-proofs")
            .remove([proofUrl]);
        } catch {
          // Best-effort cleanup; the file becomes an orphan if this fails.
        }
      }

      const messages: Record<string, string> = {
        invalid: t("errors.required"),
        login_required: t("errors.loginRequired"),
        rate_limited: t("errors.rateLimited"),
        not_owner: tResubmit("errors.notOwner"),
        wrong_state: tResubmit("errors.wrongState"),
        not_found: tResubmit("errors.notFound"),
        error: t("errors.generic"),
      };
      setError("price_sar", {
        type: "server",
        message: messages[result.code] ?? t("errors.generic"),
      });
    });
  };

  if (success) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-2xl border border-rizq-green/25 bg-rizq-green/5 px-6 py-5 flex items-start gap-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rizq-green text-rizq-cream shrink-0">
            <Check size={20} strokeWidth={2.2} />
          </span>
          <div>
            <p className={`text-base font-semibold text-rizq-green mb-1 ${font}`}>
              {isResubmit ? tResubmit("successTitle") : t("successTitle")}
            </p>
            <p className={`text-sm text-rizq-ink-soft ${font}`}>
              {isResubmit ? tResubmit("successBody") : t("successBody")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isResubmit && (
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm hover:bg-rizq-green-dark transition-all ${font}`}
            >
              <span>{t("again")}</span>
            </button>
          )}
          <Link
            href="/dashboard"
            className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
          >
            {tCommon("backToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {isResubmit && prefill?.moderator_notes && (
        <div className="rounded-2xl border border-rizq-gold/40 bg-rizq-gold/10 px-5 py-4 flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rizq-gold/20 text-rizq-gold-dark shrink-0">
            <MessageCircle size={16} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark mb-1 ${font}`}>
              {tResubmit("banner")}
            </p>
            <p className={`text-sm text-rizq-ink leading-relaxed ${font}`}>
              {prefill.moderator_notes}
            </p>
          </div>
        </div>
      )}

      <SelectField
        locale={locale}
        id="specialty_slug"
        label={t("specialtyLabel")}
        placeholder={t("specialtyLabel")}
        options={specialties}
        control={control}
        name="specialty_slug"
        error={errors.specialty_slug?.message}
      />
      <SelectField
        locale={locale}
        id="city_slug"
        label={t("cityLabel")}
        placeholder={t("cityLabel")}
        options={cities}
        control={control}
        name="city_slug"
        error={errors.city_slug?.message}
      />
      <SelectField
        locale={locale}
        id="experience_tier_slug"
        label={t("tierLabel")}
        placeholder={t("tierLabel")}
        options={tiers}
        control={control}
        name="experience_tier_slug"
        error={errors.experience_tier_slug?.message}
      />

      <FieldShell locale={locale} id="price_sar" label={t("priceLabel")} error={errors.price_sar?.message}>
        <input
          id="price_sar"
          type="number"
          inputMode="numeric"
          step="1"
          min={0}
          {...register("price_sar", { valueAsNumber: true })}
          placeholder={t("pricePlaceholder")}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors tabular ${font}`}
        />
      </FieldShell>

      <FieldShell locale={locale} id="project_type" label={t("projectTypeLabel")}>
        <input
          id="project_type"
          type="text"
          {...register("project_type")}
          placeholder={t("projectTypePlaceholder")}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors ${font}`}
        />
      </FieldShell>

      <SelectField
        locale={locale}
        id="project_size"
        label={t("projectSizeLabel")}
        placeholder={t("projectSizeAny")}
        control={control}
        name="project_size"
        options={[
          { slug: "small", label: t("projectSizeSmall") },
          { slug: "medium", label: t("projectSizeMedium") },
          { slug: "large", label: t("projectSizeLarge") },
          { slug: "enterprise", label: t("projectSizeEnterprise") },
        ]}
      />

      <FieldShell locale={locale} id="project_duration_days" label={t("durationLabel")}>
        <input
          id="project_duration_days"
          type="number"
          inputMode="numeric"
          min={0}
          {...register("project_duration_days", { valueAsNumber: true })}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors tabular ${font}`}
        />
      </FieldShell>

      <SelectField
        locale={locale}
        id="client_type"
        label={t("clientTypeLabel")}
        placeholder={t("clientTypeAny")}
        control={control}
        name="client_type"
        options={[
          { slug: "individual", label: t("clientTypeIndividual") },
          { slug: "smb", label: t("clientTypeSmb") },
          { slug: "corporate", label: t("clientTypeCorporate") },
          { slug: "government", label: t("clientTypeGovernment") },
          { slug: "other", label: t("clientTypeOther") },
        ]}
      />

      <FieldShell locale={locale} id="notes" label={t("notesLabel")}>
        <textarea
          id="notes"
          rows={3}
          {...register("notes")}
          placeholder={t("notesPlaceholder")}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors resize-none ${font}`}
        />
      </FieldShell>

      {/* Proof upload */}
      <div>
        <label
          htmlFor="proof"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("proofLabel")}
        </label>
        {proofFile ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3">
            <span className={`flex items-center gap-2 text-sm text-rizq-ink truncate ${font}`}>
              <Paperclip size={14} strokeWidth={1.8} className="text-rizq-green shrink-0" />
              <span className="truncate">{proofFile.name}</span>
              <span className="text-xs text-rizq-ink-soft/70 shrink-0">
                {(proofFile.size / 1024).toFixed(0)} KB
              </span>
            </span>
            <button
              type="button"
              onClick={() => setProofFile(null)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rizq-ink-soft/70 hover:text-[var(--over)] hover:bg-rizq-cream"
              aria-label="Remove file"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="proof"
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rizq-gold/30 bg-rizq-cream/40 hover:bg-rizq-cream/70 hover:border-rizq-green/40 cursor-pointer px-4 py-6 text-center transition-colors ${font}`}
          >
            <Paperclip size={20} strokeWidth={1.6} className="text-rizq-gold-dark" />
            <span className="text-sm text-rizq-ink">{t("proofLabel")}</span>
            <span className="text-xs text-rizq-ink-soft/70">{t("proofHint")}</span>
            <input
              id="proof"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={onFile}
              className="sr-only"
            />
          </label>
        )}
        {uploadError && (
          <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>
            {uploadError}
          </p>
        )}
      </div>

      <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>
        {t("privacy")}
      </p>

      <button
        type="submit"
        disabled={isPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" strokeWidth={2.2} />
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
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function SelectField({
  locale,
  id,
  label,
  placeholder,
  options,
  control,
  name,
  error,
}: {
  locale: "ar" | "en";
  id: string;
  label: string;
  placeholder: string;
  options: Option[];
  control: Control<FormValues>;
  name: "specialty_slug" | "city_slug" | "experience_tier_slug" | "project_size" | "client_type";
  error?: string;
}) {
  const tCommon = useTranslations("Common");
  return (
    <FieldShell locale={locale} id={id} label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Combobox
            id={id}
            locale={locale}
            value={(field.value as string) || null}
            onChange={(v) => field.onChange(v ?? "")}
            options={options.map((o) => ({ value: o.slug, label: o.label }))}
            placeholder={placeholder}
            searchPlaceholder={tCommon("combobox.searchPlaceholder")}
            emptyText={tCommon("combobox.noResults")}
            allowClear
          />
        )}
      />
    </FieldShell>
  );
}

function FieldShell({
  locale,
  id,
  label,
  children,
  error,
}: {
  locale: "ar" | "en";
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
      >
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}
    </div>
  );
}
