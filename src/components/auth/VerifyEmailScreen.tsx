"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MailCheck } from "lucide-react";
import { resendVerificationEmail } from "@/app/actions/auth/resendVerification";
import { attempt } from "@/lib/actions/attempt";

type Props = {
  locale: "ar" | "en";
  email: string;
};

export function VerifyEmailScreen({ locale, email }: Props) {
  const t = useTranslations("Auth.Verify");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [isPending, startTransition] = useTransition();
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    startTransition(async () => {
      // Only claim it was sent if the request actually completed — see
      // lib/actions/attempt. Telling someone to check an inbox for an email nobody
      // sent leaves them waiting on a link that is not coming.
      const sent = await attempt(() => resendVerificationEmail({ email, locale }));
      if (sent) setResent(true);
    });
  };

  return (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-rizq-green/10 border border-rizq-green/25 text-rizq-green mx-auto">
        <MailCheck size={28} strokeWidth={1.6} />
      </div>

      <p className={`text-base text-rizq-ink-soft leading-relaxed ${font}`}>
        {t("subtitle", { email })}
      </p>

      <p className={`text-sm text-rizq-ink-soft/70 ${font}`}>
        {t("checkSpam")}
      </p>

      {resent ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-in inline-flex items-center gap-3 rounded-full bg-rizq-green/5 border border-rizq-green/25 px-4 py-2"
        >
          <span className={`text-sm text-rizq-green ${font}`}>{t("resentTitle")}</span>
          <span className={`text-sm text-rizq-ink-soft ${font}`}>{t("resentBody")}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={isPending}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/60 hover:bg-rizq-cream hover:border-rizq-green/40 px-5 py-3 text-sm text-rizq-ink transition-all disabled:opacity-70 ${font}`}
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
              <span>{t("resending")}</span>
            </>
          ) : (
            <span>{t("resend")}</span>
          )}
        </button>
      )}
    </div>
  );
}
