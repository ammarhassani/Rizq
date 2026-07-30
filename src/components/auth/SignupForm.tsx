"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signUp } from "@/app/actions/auth/signup";
import { track } from "@/lib/analytics/track";
import { attempt } from "@/lib/actions/attempt";

type Props = { locale: "ar" | "en" };
type FormValues = { email: string; password: string };

export function SignupForm({ locale }: Props) {
  const t = useTranslations("Auth.Signup");
  const tShared = useTranslations("Auth.shared");
  const router = useRouter();
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const schema = z.object({
    email: z
      .string({ message: t("errors.emailRequired") })
      .trim()
      .min(1, { message: t("errors.emailRequired") })
      .email({ message: t("errors.emailInvalid") }),
    password: z
      .string({ message: t("errors.passwordRequired") })
      .min(8, { message: t("errors.passwordTooShort") })
      .max(72),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      // See lib/actions/attempt: without this a dead request loses the whole signup form.
      const result = await attempt(() =>
        signUp({
          email: values.email,
          password: values.password,
          language_preference: locale,
        }),
      );
      if (!result) {
        setError("email", { type: "server", message: tShared("genericError") });
        return;
      }

      if (result.ok) {
        track("signup_completed", {
          locale,
          method: "email",
          needs_verification: result.needsVerification,
        });
        // When email confirmation is off, signUp returns a live session → go
        // straight into the app (dashboard forwards new users to onboarding).
        // Only send to verify-email when confirmation is actually required.
        // NOTE: `router` is the next-intl localized router — it prepends the
        // locale itself, so paths here must be locale-less (no `/${locale}`).
        const path = result.needsVerification
          ? `/verify-email?email=${encodeURIComponent(values.email)}`
          : `/dashboard`;
        router.push(path);
        return;
      }

      const messages: Record<string, string> = {
        email_taken: t("errors.emailTaken"),
        invalid_email: t("errors.emailUndeliverable"),
        weak_password: t("errors.weakPassword"),
        rate_limited: t("errors.rateLimited"),
        invalid: t("errors.emailInvalid"),
        error: tShared("genericError"),
      };
      setError("email", {
        type: "server",
        message: messages[result.code] ?? tShared("genericError"),
      });
    });
  };

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="signup-email"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {tShared("emailLabel")}
        </label>
        <input
          id="signup-email"
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
        {errors.email && (
          <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {tShared("passwordLabel")}
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder={tShared("passwordPlaceholder")}
            {...register("password")}
            aria-invalid={errors.password ? "true" : "false"}
            className={`w-full rounded-xl border bg-rizq-cream/60 px-4 py-3 pe-12 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors ${
              errors.password ? "border-[var(--over-line)]" : "border-rizq-gold/30"
            } ${font}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? tShared("hidePassword") : tShared("showPassword")}
            className="absolute end-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-10 w-10 rounded-full text-rizq-ink-soft/70 hover:text-rizq-green hover:bg-rizq-cream transition-colors"
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.6} /> : <Eye size={18} strokeWidth={1.6} />}
          </button>
        </div>
        {errors.password && (
          <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>
            {errors.password.message}
          </p>
        )}
      </div>

      <p className={`text-xs text-rizq-ink-soft/70 leading-relaxed ${font}`}>
        {tShared("termsBlurb")}
      </p>

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
