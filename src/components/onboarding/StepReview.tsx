"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { completeOnboarding } from "@/app/actions/onboarding/completeOnboarding";
import { getProfileSnapshot } from "@/app/actions/onboarding/getProfileSnapshot";
import { useRouter } from "@/i18n/navigation";
import type { ProfileSnapshot, StepProps } from "./types";
import { fmtCount } from "@/lib/format/number";

export function StepReview({ locale, profile, onBack, onNext, onSkip }: StepProps) {
  const t = useTranslations("Onboarding.v2.steps.review");
  const tv2 = useTranslations("Onboarding.v2");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The wizard's snapshot is the one the page was server-rendered with; only the
  // completeness pct is patched as steps save. Re-read so the section chips below
  // describe what is actually stored, not what was there before onboarding started.
  const [live, setLive] = useState<ProfileSnapshot>(profile);
  useEffect(() => {
    let alive = true;
    getProfileSnapshot()
      .then((p) => {
        if (alive && p) setLive(p);
      })
      .catch(() => {
        /* keep the wizard's snapshot */
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding();
      if (result.ok) {
        setDone(true);
        // A plain push here raced with refresh() and left users stranded on the
        // success screen with no way forward. `replace` also drops the finished
        // wizard from history so Back doesn't return to it.
        router.replace("/dashboard");
      } else {
        setError(tv2("errorComplete"));
      }
    });
  };

  const pct = live.profile_completeness_pct ?? profile.profile_completeness_pct ?? 0;

  const sections = [
    {
      label: t("sectionIdentity"),
      filled: Boolean(live.full_name_ar || live.fl_number),
    },
    {
      label: t("sectionProfessional"),
      filled: Boolean(live.specialties?.length || live.years_experience),
    },
    {
      label: t("sectionRates"),
      filled: Boolean(
        live.current_hourly_rate_sar ||
          live.current_daily_rate_sar ||
          live.income_goal_monthly_sar
      ),
    },
    {
      label: t("sectionBrand"),
      filled: Boolean(live.tagline_ar || live.bio_ar),
    },
  ];

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex flex-col items-center text-center gap-5 py-6 ${font}`}
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="w-16 h-16 rounded-full bg-rizq-green/10 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-rizq-green" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-rizq-ink">{t("successTitle")}</h3>
          <p className="text-sm text-rizq-ink-soft mt-1">{t("successBody")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? 24 : -24 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      dir={isAr ? "rtl" : "ltr"}
      className={`space-y-6 ${font}`}
    >
      {/* Completeness bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium text-rizq-ink ${font}`}>
            {t("completenessLabel")}
          </span>
          <span className="text-sm font-bold text-rizq-green">{fmtCount(pct, locale)}%</span>
        </div>
        <div className="h-2 rounded-full bg-rizq-gold/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-rizq-green transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Section summary */}
      <div className="space-y-2">
        {sections.map(({ label, filled }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-rizq-gold/20 bg-rizq-cream/40 px-4 py-3"
          >
            <span className={`text-sm text-rizq-ink ${font}`}>{label}</span>
            <span
              className={`text-xs rounded-full px-2.5 py-0.5 ${font} ${
                filled
                  ? "bg-rizq-green/10 text-rizq-green"
                  : "bg-rizq-gold/10 text-rizq-ink-soft"
              }`}
            >
              {filled
                ? isAr
                  ? "مكتمل"
                  : "Done"
                : isAr
                ? "غير مكتمل"
                : "Incomplete"}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}

      <div className={`flex items-center justify-between gap-3 pt-2 ${font}`}>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors disabled:opacity-50"
        >
          {tv2("back")}
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>{tv2("completing")}</span>
            </>
          ) : (
            <span>{t("completeBtn")}</span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
