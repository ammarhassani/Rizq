"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { calculate, type ToolActionResult } from "@/app/actions/tool/calculate";
import { PROVENANCE_LABEL } from "@/lib/pricing/provenance";
import { track } from "@/lib/analytics/track";
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
  isAuthed: boolean;
};

const VALID_SIZES = new Set(["small", "medium", "large", "enterprise"]);

function safeParam(
  raw: string | null,
  validValues: Set<string>
): string {
  if (!raw) return "";
  return validValues.has(raw) ? raw : "";
}

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
  isAuthed,
}: Props) {
  const t = useTranslations("Tool");
  const search = useSearchParams();
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Prefill from URL params when arriving via "Run again" links in the
  // dashboard. Each value is validated against the known option lists to
  // prevent injecting arbitrary strings.
  const specialtySlugs = new Set(specialties.map((s) => s.slug));
  const citySlugs = new Set(cities.map((c) => c.slug));
  const tierSlugs = new Set(tiers.map((t2) => t2.slug));

  const [specialty, setSpecialty] = useState(() =>
    safeParam(search?.get("specialty") ?? null, specialtySlugs)
  );
  const [city, setCity] = useState(() =>
    safeParam(search?.get("city") ?? null, citySlugs)
  );
  const [tier, setTier] = useState(() =>
    safeParam(search?.get("tier") ?? null, tierSlugs)
  );
  const [projectSize, setProjectSize] = useState<string>(() =>
    safeParam(search?.get("size") ?? null, VALID_SIZES)
  );

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
          track("quota_exhausted", {
            locale,
            mode: result.cta === "signup" ? "anon" : "free",
          });
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
        track("query_insufficient_data", {
          locale,
          specialty,
          city,
          tier,
        });
        setView({ kind: "insufficient", data: result });
        return;
      }

      track("query_calculated", {
        locale,
        specialty,
        city,
        tier,
        project_size: projectSize || null,
        median: result.result.status === "ok" ? result.result.anchor : null,
        sample_size:
          result.result.status === "ok" ? result.result.sample_size : null,
        fallback_used:
          result.result.status === "ok" ? result.result.fallback_used : null,
      });
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
        median={r.anchor}
        max={r.max}
        sample_size={r.sample_size}
        fallback_used={r.fallback_used}
        fallback_kind={r.fallback_kind}
        comparison_percent_below={r.comparison_percent_below}
        provenanceLabel={PROVENANCE_LABEL[r.dominant_provenance][locale === "ar" ? "ar" : "en"]}
        provenanceCitation={locale === "ar" ? r.provenance_citation_ar : r.provenance_citation_en}
        confidenceScore={r.confidence_score}
        provenanceKind={r.dominant_provenance}
        canShare={canShare}
        isAuthed={isAuthed}
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
        className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors appearance-none ${font}`}
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
