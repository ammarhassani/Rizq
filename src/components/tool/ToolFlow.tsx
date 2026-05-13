"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { calculate, type ToolActionResult } from "@/app/actions/tool/calculate";
import { ResultCard } from "./ResultCard";
import { ResultSkeleton } from "./ResultSkeleton";
import { InsufficientCard } from "./InsufficientCard";
import { QuotaExhaustedCard } from "./QuotaExhaustedCard";

type Option = { slug: string; label: string; hint?: string };

type Props = {
  locale: "ar" | "en";
  specialties: Option[];
  cities: Option[];
  tiers: Option[];
  canShare: boolean;
};

type View =
  | { kind: "form"; error?: string }
  | { kind: "loading" }
  | { kind: "result"; data: Extract<ToolActionResult, { ok: true }> }
  | { kind: "insufficient"; data: Extract<ToolActionResult, { ok: true }> }
  | { kind: "exhausted"; mode: "anon" | "free" };

const PROJECT_SIZES: ("small" | "medium" | "large" | "enterprise")[] = [
  "small",
  "medium",
  "large",
  "enterprise",
];

export function ToolFlow({
  locale,
  specialties,
  cities,
  tiers,
  canShare,
}: Props) {
  const t = useTranslations("Tool");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [tier, setTier] = useState("");
  const [projectSize, setProjectSize] = useState<string>("");

  const [view, setView] = useState<View>({ kind: "form" });
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialty || !city || !tier) {
      setView({ kind: "form", error: t("errors.selectAll") });
      return;
    }
    setView({ kind: "loading" });

    startTransition(async () => {
      const result = await calculate({
        specialty_slug: specialty,
        city_slug: city,
        experience_tier_slug: tier,
        project_size: (projectSize || null) as
          | "small"
          | "medium"
          | "large"
          | "enterprise"
          | null,
      });

      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setView({
            kind: "exhausted",
            mode: (result.cta === "signup" ? "anon" : "free") as "anon" | "free",
          });
          return;
        }
        setView({
          kind: "form",
          error:
            result.code === "rate_limited"
              ? t("errors.rate_limited")
              : t("errors.error"),
        });
        return;
      }

      if (result.result.status === "insufficient_data") {
        setView({ kind: "insufficient", data: result });
        return;
      }
      setView({ kind: "result", data: result });
    });
  };

  const reset = () => {
    setView({ kind: "form" });
  };

  if (view.kind === "loading") return <ResultSkeleton />;

  if (view.kind === "exhausted") {
    return <QuotaExhaustedCard locale={locale} mode={view.mode} />;
  }

  if (view.kind === "insufficient") {
    return <InsufficientCard locale={locale} onReset={reset} />;
  }

  if (view.kind === "result" && view.data.result.status === "ok") {
    const r = view.data.result;
    return (
      <ResultCard
        locale={locale}
        query_id={view.data.query_id}
        min={r.min}
        median={r.median}
        max={r.max}
        sample_size={r.sample_size}
        fallback_used={r.fallback_used}
        fallback_kind={r.fallback_kind}
        comparison_percent_below={r.comparison_percent_below}
        canShare={canShare}
        onReset={reset}
      />
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 space-y-6 animate-fade-in"
      noValidate
    >
      <SelectField
        locale={locale}
        id="specialty"
        label={t("specialtyLabel")}
        placeholder={t("specialtyPlaceholder")}
        value={specialty}
        onChange={setSpecialty}
        options={specialties}
      />

      <SelectField
        locale={locale}
        id="city"
        label={t("cityLabel")}
        placeholder={t("cityPlaceholder")}
        value={city}
        onChange={setCity}
        options={cities}
      />

      <SelectField
        locale={locale}
        id="tier"
        label={t("tierLabel")}
        placeholder={t("tierPlaceholder")}
        value={tier}
        onChange={setTier}
        options={tiers}
      />

      <SelectField
        locale={locale}
        id="size"
        label={t("projectSizeLabel")}
        placeholder={t("projectSizeAny")}
        value={projectSize}
        onChange={setProjectSize}
        options={PROJECT_SIZES.map((s) => ({
          slug: s,
          label: t(
            `projectSize${s.charAt(0).toUpperCase()}${s.slice(1)}` as
              | "projectSizeSmall"
              | "projectSizeMedium"
              | "projectSizeLarge"
              | "projectSizeEnterprise"
          ),
        }))}
      />

      {view.kind === "form" && view.error && (
        <p role="alert" className={`text-sm text-red-700 ${font}`}>
          {view.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={`group w-full inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-7 py-4 text-base font-medium tracking-wide hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? (
          <>
            <Loader2 size={18} className="animate-spin" strokeWidth={2.2} />
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

function SelectField({
  locale,
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  locale: "ar" | "en";
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus:border-rizq-green focus:bg-rizq-cream transition-colors appearance-none ${font}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
            {o.hint ? ` · ${o.hint}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
