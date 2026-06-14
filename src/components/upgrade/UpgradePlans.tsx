"use client";

/**
 * UpgradePlans — Phase-6 P6.6
 *
 * Free vs Pro comparison table + upgrade CTA.
 * Handles the "coming soon" response from startUpgradeAction gracefully.
 * Tap Payments not yet wired — CTA routes to a contact state.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Minus, Loader2, Mail } from "lucide-react";
import { startUpgradeAction } from "@/app/actions/billing/upgrade";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  locale: "ar" | "en";
  /** Pre-fetched tier info. When isPro=true, shows "already Pro" state. */
  isPro: boolean;
  pro_until: string | null;
};

type PlanToggle = "monthly" | "annual";

type CheckoutState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "coming_soon"; contact: string }
  | { status: "error" };

// ─── Feature rows ─────────────────────────────────────────────────────────────

type FeatureRow = {
  labelKey: string;
  freeKey: string;
  proKey: string;
  proOnly?: boolean;
};

const FEATURES: FeatureRow[] = [
  { labelKey: "featureProposals",         freeKey: "featureProposalsFree",         proKey: "featureProposalsPro" },
  { labelKey: "featureToneAi",            freeKey: "featureToneAiFree",            proKey: "featureToneAiPro" },
  { labelKey: "featureClients",           freeKey: "featureClientsFree",           proKey: "featureClientsPro" },
  { labelKey: "featureClientAiInsights",  freeKey: "featureClientAiInsightsFree",  proKey: "featureClientAiInsightsPro", proOnly: true },
  { labelKey: "featureGigs",              freeKey: "featureGigsFree",              proKey: "featureGigsPro" },
  { labelKey: "featureIncomeForecast",    freeKey: "featureIncomeForecastFree",    proKey: "featureIncomeForecastPro",   proOnly: true },
  { labelKey: "featureInvoices",          freeKey: "featureInvoicesFree",          proKey: "featureInvoicesPro" },
  { labelKey: "featurePricingLookups",    freeKey: "featurePricingLookupsFree",    proKey: "featurePricingLookupsPro" },
  { labelKey: "featureDocuments",         freeKey: "featureDocumentsFree",         proKey: "featureDocumentsPro" },
  { labelKey: "featureCsvExport",         freeKey: "featureCsvExportFree",         proKey: "featureCsvExportPro",        proOnly: true },
  { labelKey: "featureCustomBranding",    freeKey: "featureCustomBrandingFree",    proKey: "featureCustomBrandingPro",   proOnly: true },
  { labelKey: "featureCleanPdf",          freeKey: "featureCleanPdfFree",          proKey: "featureCleanPdfPro",         proOnly: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradePlans({ locale, isPro, pro_until }: Props) {
  const t = useTranslations("Upgrade");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [plan, setPlan] = useState<PlanToggle>("monthly");
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const [, startTransition] = useTransition();

  // ── Already Pro ─────────────────────────────────────────────────────────────

  if (isPro) {
    const until =
      pro_until
        ? new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(pro_until))
        : null;

    return (
      <div
        dir={dir}
        className={`rounded-3xl border border-rizq-green/30 bg-rizq-green/5 p-8 sm:p-10 text-center ${font}`}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rizq-green/15 mb-5">
          <Check size={26} className="text-rizq-green" strokeWidth={2.5} />
        </div>
        <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>
          {t("alreadyProTitle")}
        </h2>
        <p className={`text-sm text-rizq-ink-soft mb-1 ${font}`}>
          {t("alreadyProBody")}
        </p>
        {until && (
          <p className="text-xs text-rizq-ink-soft/60 mt-1">
            {t("alreadyProUntil", { date: until })}
          </p>
        )}
        <a
          href={`/${locale}/dashboard`}
          className={`mt-6 inline-flex items-center rounded-full bg-rizq-green text-rizq-cream px-7 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-all ${font}`}
        >
          {t("alreadyProCta")}
        </a>
      </div>
    );
  }

  // ── Upgrade CTA handler ──────────────────────────────────────────────────────

  function handleUpgrade() {
    setCheckout({ status: "loading" });
    startTransition(async () => {
      const result = await startUpgradeAction({ plan });
      if (!result.ok) {
        setCheckout({ status: "error" });
        return;
      }
      // Tap Payments deferred — show coming-soon state
      setCheckout({ status: "coming_soon", contact: result.contact });
    });
  }

  // ── Coming-soon panel ────────────────────────────────────────────────────────

  if (checkout.status === "coming_soon") {
    const contactHref = `mailto:${checkout.contact}?subject=${encodeURIComponent(isAr ? "وصول احترافي مبكر — رِزق" : "Early Pro access — Rizq")}`;
    return (
      <div
        dir={dir}
        className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-8 sm:p-10 text-center animate-fade-in ${font}`}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rizq-gold/10 mb-5">
          <Mail size={24} className="text-rizq-gold-dark" />
        </div>
        <h2 className={`text-xl font-semibold text-rizq-ink mb-2 ${font}`}>
          {t("comingSoonTitle")}
        </h2>
        <p className={`text-sm text-rizq-ink-soft mb-4 ${font}`}>
          {t("comingSoonBody")}
        </p>
        <p className="text-xs text-rizq-ink-soft/60 mb-6">
          {t("comingSoonContact", { email: checkout.contact })}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href={contactHref}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-all ${font}`}
          >
            <Mail size={14} />
            {t("comingSoonCta")}
          </a>
          <button
            type="button"
            onClick={() => setCheckout({ status: "idle" })}
            className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
          >
            {t("backToUpgrade")}
          </button>
        </div>
      </div>
    );
  }

  // ── Main plans view ──────────────────────────────────────────────────────────

  const price = plan === "monthly" ? t("proPriceMonthly") : t("proPriceAnnual");
  const period = plan === "monthly" ? t("proPricePeriodMonthly") : t("proPricePeriodAnnual");

  return (
    <div dir={dir} className={`space-y-8 ${font}`}>

      {/* Monthly / Annual toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-rizq-gold/25 bg-rizq-cream/80 p-1 gap-1">
          {(["monthly", "annual"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                plan === p
                  ? "bg-rizq-green text-rizq-cream"
                  : "text-rizq-ink-soft hover:text-rizq-ink"
              } ${font}`}
            >
              {t(p === "monthly" ? "toggleMonthly" : "toggleAnnual")}
              {p === "annual" && (
                <span className={`${isAr ? "me-2" : "ms-2"} text-xs ${plan === p ? "text-rizq-cream/80" : "text-rizq-green"}`}>
                  {t("annualSavings")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Free plan card */}
        <div className="rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 p-6">
          <p className="text-xs font-medium text-rizq-ink-soft/60 tracking-wide uppercase mb-1">
            {t("freePlanName")}
          </p>
          <p className={`text-2xl font-bold text-rizq-ink mb-0.5 ${font}`}>
            {isAr ? "٠ ريال" : "0 SAR"}
          </p>
          <p className={`text-xs text-rizq-ink-soft/60 mb-4 ${font}`}>{t("freePlanTagline")}</p>
          <div className="space-y-2">
            {FEATURES.map((f) => {
              const val = t(f.freeKey as Parameters<typeof t>[0]);
              const isDash = val === "—";
              return (
                <div key={f.labelKey} className="flex items-start gap-2.5">
                  {isDash ? (
                    <Minus size={14} className="text-rizq-ink-soft/30 mt-0.5 shrink-0" />
                  ) : (
                    <Check size={14} className="text-rizq-ink-soft/60 mt-0.5 shrink-0" />
                  )}
                  <span className={`text-xs text-rizq-ink-soft ${isDash ? "opacity-50" : ""} ${font}`}>
                    <span className="font-medium">{t(f.labelKey as Parameters<typeof t>[0])}</span>
                    {" · "}
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pro plan card */}
        <div className="rounded-2xl border-2 border-rizq-green/50 bg-white/70 p-6 relative overflow-hidden">
          {/* Subtle green gradient accent */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-rizq-green/5 to-transparent pointer-events-none"
          />

          <p className="text-xs font-medium text-rizq-green tracking-wide uppercase mb-1">
            {t("proPlanName")}
          </p>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className={`text-2xl font-bold text-rizq-ink ${font}`}>{price}</span>
            <span className={`text-sm text-rizq-ink-soft/70 ${font}`}>{period}</span>
          </div>
          <p className={`text-xs text-rizq-ink-soft/60 mb-4 ${font}`}>{t("proPlanTagline")}</p>

          <div className="space-y-2 mb-6">
            {FEATURES.map((f) => {
              const val = t(f.proKey as Parameters<typeof t>[0]);
              return (
                <div key={f.labelKey} className="flex items-start gap-2.5">
                  <Check size={14} className="text-rizq-green mt-0.5 shrink-0" />
                  <span className={`text-xs text-rizq-ink ${font}`}>
                    <span className="font-medium">{t(f.labelKey as Parameters<typeof t>[0])}</span>
                    {" · "}
                    {f.proOnly ? (
                      <span className="text-rizq-green font-semibold">{val}</span>
                    ) : (
                      val
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={checkout.status === "loading"}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
          >
            {checkout.status === "loading" ? (
              <><Loader2 size={15} className="animate-spin" /> {t("ctaUpgrading")}</>
            ) : (
              t("ctaUpgrade")
            )}
          </button>

          {checkout.status === "error" && (
            <p className={`text-xs text-red-700 text-center mt-2 ${font}`}>
              {isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again."}
            </p>
          )}
        </div>
      </div>

      {/* Halal note */}
      <p className={`text-center text-xs text-rizq-ink-soft/60 ${font}`}>
        {t("halalNote")}
      </p>
    </div>
  );
}
