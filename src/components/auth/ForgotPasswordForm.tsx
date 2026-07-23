"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth/forgotPassword";

type Props = { locale: "ar" | "en" };
type FormValues = { email: string };

export function ForgotPasswordForm({ locale }: Props) {
  const t = useTranslations("Auth.Forgot");
  const tShared = useTranslations("Auth.shared");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const schema = z.object({
    email: z.string().trim().min(1).email(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      // Server action returns ok=true even when the email isn't registered,
      // to prevent account enumeration. UX shows success regardless.
      await requestPasswordReset({ email: values.email, locale });
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div role="status" aria-live="polite" className="animate-fade-in">
        <div className="inline-flex items-center gap-4 rounded-2xl border border-rizq-green/25 bg-rizq-green/5 px-5 py-4 w-full">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rizq-green text-rizq-cream shrink-0">
            <Check size={18} strokeWidth={2.2} />
          </span>
          <div className="flex flex-col">
            <span className={`text-sm font-semibold text-rizq-green ${font}`}>
              {t("successTitle")}
            </span>
            <span className={`text-sm text-rizq-ink-soft ${font}`}>
              {t("successBody")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="forgot-email"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {tShared("emailLabel")}
        </label>
        <input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={tShared("emailPlaceholder")}
          {...register("email")}
          aria-invalid={errors.email ? "true" : "false"}
          className={`w-full rounded-xl border bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors ${
            errors.email ? "border-[var(--over-line)]" : "border-rizq-gold/30"
          } ${font}`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3.5 text-sm font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
            <span>{t("submitting")}</span>
          </>
        ) : (
          <span>{t("submit")}</span>
        )}
      </button>
    </form>
  );
}
