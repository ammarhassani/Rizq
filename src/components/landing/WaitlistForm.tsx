"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { joinWaitlist } from "@/app/actions/waitlist";
import { track } from "@/lib/analytics/track";

type Props = { locale: "ar" | "en" };

type FormValues = { email: string };

export function WaitlistForm({ locale }: Props) {
  const t = useTranslations("Waitlist");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const schema = z.object({
    email: z
      .string({ message: t("errorRequired") })
      .trim()
      .min(1, { message: t("errorRequired") })
      .email({ message: t("errorInvalidEmail") }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await joinWaitlist({
        email: values.email,
        language_preference: locale,
        source: "landing",
      });

      if (result.ok) {
        track("waitlist_joined", { locale });
        setSuccess(true);
        reset();
        return;
      }

      const message =
        result.code === "rate_limited"
          ? t("errorRateLimited")
          : result.code === "duplicate"
            ? t("errorDuplicate")
            : result.code === "invalid"
              ? t("errorInvalidEmail")
              : t("errorGeneric");

      setError("email", { type: "server", message });
    });
  };

  if (success) {
    return (
      <div
        role="status"
        className="w-full max-w-xl animate-fade-in"
        aria-live="polite"
      >
        <div className="inline-flex items-center gap-4 rounded-full border border-rizq-green/30 bg-rizq-green/5 px-6 py-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rizq-green text-rizq-cream">
            <Check size={18} strokeWidth={2.2} />
          </span>
          <div className="flex flex-col">
            <span className={`text-sm font-semibold text-rizq-green ${font}`}>
              {t("successTitle")}
            </span>
            <span className={`text-xs text-rizq-ink-soft ${font}`}>
              {t("successBody")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-xl"
      noValidate
      aria-describedby={errors.email ? "waitlist-error" : undefined}
    >
      <div
        className={`group flex flex-col sm:flex-row items-stretch gap-3 sm:gap-0 sm:rounded-full sm:border sm:bg-rizq-cream/70 sm:p-1.5 sm:backdrop-blur-sm transition-all ${
          errors.email
            ? "sm:border-red-500/50"
            : "sm:border-rizq-gold/30 focus-within:sm:border-rizq-green/50 focus-within:sm:shadow-[0_4px_24px_-12px_rgba(26,95,63,0.35)]"
        }`}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          {...register("email")}
          className={`flex-1 bg-transparent border rounded-full sm:rounded-none sm:border-0 px-5 py-4 text-base text-rizq-ink placeholder:text-rizq-ink-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream ${
            errors.email ? "border-red-500/50" : "border-rizq-gold/30"
          } ${font}`}
        />
        <button
          type="submit"
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3.5 text-sm font-medium tracking-wide hover:bg-rizq-green-dark transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
              <span>{t("submitting")}</span>
            </>
          ) : (
            <>
              <span>{t("submit")}</span>
              <span className="inline-block rtl:rotate-180">→</span>
            </>
          )}
        </button>
      </div>

      {errors.email && (
        <p
          id="waitlist-error"
          role="alert"
          className={`mt-3 text-sm text-[var(--over)] ${font}`}
        >
          {errors.email.message}
        </p>
      )}

      <p className={`mt-4 text-xs text-rizq-ink-soft/60 ${font}`}>
        {t("privacyNote")}
      </p>
    </form>
  );
}
