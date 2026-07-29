"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Users } from "lucide-react";
import { setBenchmarkConsent } from "@/app/actions/settings/setBenchmarkConsent";

type Props = {
  locale: "ar" | "en";
  initialEnabled: boolean;
};

/**
 * Opt-in to the benchmark. Off by default and off unless someone deliberately turns it on —
 * the freelancer's own prices are theirs, and PDPL treats silence as refusal, not consent.
 */
export function BenchmarkConsent({ locale, initialEnabled }: Props) {
  const t = useTranslations("Settings.benchmark");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next); // optimistic — reverted below if the write fails
    setError(null);
    startTransition(async () => {
      const res = await setBenchmarkConsent(next);
      if (!res.ok) {
        setEnabled(!next);
        setError(t("error"));
      }
    });
  }

  return (
    <div className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 px-5 py-4 ${font}`}>
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-rizq-green" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-rizq-ink">{t("title")}</h3>
          <p className="mt-1 text-sm text-rizq-ink-soft">{t("body")}</p>
          <p className="mt-2 text-xs text-rizq-ink-soft/80">{t("privacy")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t("title")}
          onClick={toggle}
          disabled={isPending}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rizq-green/40 ${
            enabled ? "bg-rizq-green" : "bg-rizq-ink/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled
                ? locale === "ar"
                  ? "-translate-x-6"
                  : "translate-x-6"
                : locale === "ar"
                  ? "-translate-x-1"
                  : "translate-x-1"
            }`}
          />
          {isPending && (
            <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--over-line)]">
          {error}
        </p>
      )}
    </div>
  );
}
