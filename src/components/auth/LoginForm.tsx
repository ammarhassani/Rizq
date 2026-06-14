"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { logIn } from "@/app/actions/auth/login";
import { track } from "@/lib/analytics/track";

type Props = { locale: "ar" | "en" };
type FormValues = { email: string; password: string };

export function LoginForm({ locale }: Props) {
  const t = useTranslations("Auth.Login");
  const tShared = useTranslations("Auth.shared");
  const router = useRouter();
  const search = useSearchParams();
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const schema = z.object({
    email: z.string().trim().min(1).email(),
    password: z.string().min(1),
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
      const result = await logIn({
        email: values.email,
        password: values.password,
      });

      if (result.ok) {
        track("login_completed", { locale, method: "email" });
        // Strip the locale prefix from returnTo since router.push re-adds it.
        const raw = search?.get("returnTo") ?? `/dashboard`;
        const stripped = raw.replace(/^\/(?:ar|en)/, "") || "/dashboard";
        router.push(stripped);
        router.refresh();
        return;
      }

      const messages: Record<string, string> = {
        invalid_credentials: t("errors.invalidCredentials"),
        email_not_confirmed: t("errors.emailNotConfirmed"),
        rate_limited: t("errors.rateLimited"),
        invalid: t("errors.invalidCredentials"),
        error: tShared("genericError"),
      };
      setError("email", {
        type: "server",
        message: messages[result.code] ?? tShared("genericError"),
      });
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} method="post" noValidate className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {tShared("emailLabel")}
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={tShared("emailPlaceholder")}
          {...register("email")}
          aria-invalid={errors.email ? "true" : "false"}
          className={`w-full rounded-xl border bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors ${
            errors.email ? "border-red-500/60" : "border-rizq-gold/30"
          } ${font}`}
        />
        {errors.email && (
          <p role="alert" className={`mt-2 text-sm text-red-700 ${font}`}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="login-password"
            className={`text-sm font-medium text-rizq-ink ${font}`}
          >
            {tShared("passwordLabel")}
          </label>
          <Link
            href="/forgot-password"
            className={`text-xs text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={tShared("passwordPlaceholder")}
            {...register("password")}
            aria-invalid={errors.password ? "true" : "false"}
            className={`w-full rounded-xl border bg-rizq-cream/60 px-4 py-3 pe-12 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors ${
              errors.password ? "border-red-500/60" : "border-rizq-gold/30"
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
