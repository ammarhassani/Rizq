"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Check, Loader2, Eye, EyeOff } from "lucide-react";
import { setNewPassword } from "@/app/actions/auth/resetPassword";

type Props = { locale: "ar" | "en" };
type FormValues = { password: string; confirm: string };

export function ResetPasswordForm({ locale }: Props) {
  const t = useTranslations("Auth.Reset");
  const tShared = useTranslations("Auth.shared");
  const router = useRouter();
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const schema = z
    .object({
      password: z.string().min(8, { message: t("errors.tooShort") }).max(72),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: t("errors.mismatch"),
      path: ["confirm"],
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
  const [success, setSuccess] = useState(false);

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await setNewPassword({ password: values.password });
      if (result.ok) {
        setSuccess(true);
        return;
      }

      const messages: Record<string, string> = {
        weak_password: t("errors.tooShort"),
        no_session: t("errors.linkExpired"),
        invalid: t("errors.tooShort"),
        error: tShared("genericError"),
      };
      setError("password", {
        type: "server",
        message: messages[result.code] ?? tShared("genericError"),
      });
    });
  };

  if (success) {
    return (
      <div className="animate-fade-in space-y-4">
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
        <Link
          href="/login"
          className={`inline-flex items-center gap-2 text-sm text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
          onClick={() => router.push("/login")}
        >
          {t("goToLogin")} <span className="inline-block rtl:rotate-180">→</span>
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="reset-password"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("newPasswordLabel")}
        </label>
        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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
        {errors.password && (
          <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="reset-confirm"
          className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
        >
          {t("confirmLabel")}
        </label>
        <input
          id="reset-confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          {...register("confirm")}
          aria-invalid={errors.confirm ? "true" : "false"}
          className={`w-full rounded-xl border bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors ${
            errors.confirm ? "border-red-500/60" : "border-rizq-gold/30"
          } ${font}`}
        />
        {errors.confirm && (
          <p role="alert" className={`mt-2 text-sm text-[var(--over)] ${font}`}>
            {errors.confirm.message}
          </p>
        )}
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
