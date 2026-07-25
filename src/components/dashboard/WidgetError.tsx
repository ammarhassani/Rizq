"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

/**
 * Widget-level error + retry state. Shown when a dashboard query FAILS — distinct from the
 * empty state, so a transient error never masquerades as "you have nothing yet" (Principle V).
 */
export function WidgetError({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter();
  const tI18n = useTranslations("Dashboard");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  return (
    <div className={`text-center py-4 ${font}`}>
      <AlertTriangle className="h-5 w-5 text-rizq-gold mx-auto mb-2" aria-hidden="true" />
      <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>
        {tI18n("couldnTLoad")}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className={`text-xs text-rizq-green hover:underline ${font}`}
      >
        {tI18n("tapRetry")}
      </button>
    </div>
  );
}
