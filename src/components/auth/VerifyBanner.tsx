"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { resendVerificationEmail } from "@/app/actions/auth/resendVerification";
import { attempt } from "@/lib/actions/attempt";

type Props = { locale: "ar" | "en"; email: string };

export function VerifyBanner({ locale, email }: Props) {
  const t = useTranslations("Dashboard");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const onResend = () => {
    startTransition(async () => {
      // Only claim it was sent if the request actually completed — see
      // lib/actions/attempt. Telling someone to check an inbox for an email nobody
      // sent leaves them waiting on a link that is not coming.
      const sent = await attempt(() => resendVerificationEmail({ email, locale }));
      if (sent) setSent(true);
    });
  };

  return (
    <div className="rounded-2xl border border-rizq-gold/40 bg-rizq-gold/8 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rizq-gold/20 text-rizq-gold-dark shrink-0">
        <AlertCircle size={18} strokeWidth={1.8} />
      </span>
      <div className="flex-1">
        <p className={`text-sm font-semibold text-rizq-ink ${font}`}>
          {t("verifyBannerTitle")}
        </p>
        <p className={`text-sm text-rizq-ink-soft ${font}`}>
          {t("verifyBannerBody")}
        </p>
      </div>
      {sent ? (
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-2 text-sm text-rizq-green ${font}`}
        >
          <Check size={16} strokeWidth={2.2} />
          {t("verifyBannerSent")}
        </span>
      ) : (
        <button
          type="button"
          onClick={onResend}
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-4 py-2 text-sm font-medium hover:bg-rizq-green-dark transition-all disabled:opacity-70 ${font}`}
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
          ) : null}
          <span>{t("verifyBannerCta")}</span>
        </button>
      )}
    </div>
  );
}
