"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Locale-scoped error boundary. Catches uncaught client-side errors and
 * shows a recoverable screen instead of Next.js's default debug page.
 * Sentry's instrumentation-client also receives the exception.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale() as "ar" | "en";
  const tI18n = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  useEffect(() => {
    // Best-effort: log the digest (a server-generated id) for the admin
    // to cross-reference in Sentry. Don't dump the full error object —
    // it may contain PII.
    console.error("[client-error]", { digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-4">{tI18n("error")}</p>
        <h1 className={`display-2 text-rizq-ink mb-3 ${font}`}>
          {tI18n("somethingWentWrong")}
        </h1>
        <p className={`text-base text-rizq-ink-soft mb-8 ${font}`}>
          {isAr
            ? "حاول تحديث الصفحة أو العودة للرئيسية. سُجّل الخطأ تلقائيًا."
            : "Try refreshing or heading back home. The issue has been logged."}
        </p>
        {error.digest && (
          <p className={`mb-6 text-[10px] tracking-[0.18em] uppercase text-rizq-ink-soft/60 tabular ${font}`}>
            {tI18n("ref")} · {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-colors ${font}`}
          >
            <span>{tI18n("tryAgain")}</span>
          </button>
          <Link
            href="/"
            className={`inline-flex items-center gap-2 text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
          >
            <span className="inline-block rtl:rotate-180">←</span>
            <span>{tI18n("home")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
