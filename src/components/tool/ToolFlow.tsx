"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { calculate, type ToolActionResult } from "@/app/actions/tool/calculate";
import { PROVENANCE_LABEL } from "@/lib/pricing/provenance";
import { track } from "@/lib/analytics/track";
import { Combobox } from "@/components/ui/Combobox";
import { ResultCard } from "./ResultCard";
import { ResultSkeleton } from "./ResultSkeleton";
import { InsufficientCard } from "./InsufficientCard";
import { QuotaExhaustedCard } from "./QuotaExhaustedCard";
import { QuotaBadge } from "./QuotaBadge";
import { resolvePrefill } from "@/lib/pricing/toolPrefill";

type Option = { slug: string; label: string; hint?: string };

type Props = {
  locale: "ar" | "en";
  specialties: Option[];
  cities: Option[];
  tiers: Option[];
  canShare: boolean;
  isAuthed: boolean;
  /**
   * The freelancer's stored specialty/city/experience. Seeds the form so the tool opens
   * ready to run instead of asking for what onboarding already captured. A URL parameter
   * still wins, and every field stays editable.
   */
  profilePrefill?: {
    specialtySlug: string | null;
    citySlug: string | null;
    tierSlug: string | null;
  };
  /** Allowance as of page load. Re-rendered from the action's result after each lookup. */
  quota: {
    mode: "anon" | "free" | "pro" | "admin";
    remaining: number | "unlimited";
    limit: number;
  };
  /** Page heading rendered above the tool; kept here so the badge can live beside it. */
  header?: React.ReactNode;
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
  profilePrefill,
  quota,
  header,
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
    resolvePrefill(search?.get("specialty"), profilePrefill?.specialtySlug, specialtySlugs)
  );
  const [city, setCity] = useState(() =>
    resolvePrefill(search?.get("city"), profilePrefill?.citySlug, citySlugs)
  );
  const [tier, setTier] = useState(() =>
    resolvePrefill(search?.get("tier"), profilePrefill?.tierSlug, tierSlugs)
  );
  const [projectSize, setProjectSize] = useState<string>(() =>
    safeParam(search?.get("size") ?? null, VALID_SIZES)
  );

  const [view, setView] = useState<View>({ kind: "form" });
  // The badge is server-rendered on load, then follows what the action actually enforced —
  // including a repeated lookup that consumed nothing and leaves this unchanged.
  const [remaining, setRemaining] = useState(quota.remaining);
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
          setRemaining(0);
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

      setRemaining(result.quota.remaining);

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

  /** The heading + live allowance badge, rendered above whichever view is active. */
  const chrome = (
    <div className="mb-7 sm:mb-9 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      {header}
      <div className="shrink-0">
        <QuotaBadge
          locale={locale}
          mode={quota.mode}
          remaining={remaining}
          limit={quota.limit}
        />
      </div>
    </div>
  );

  const withChrome = (body: React.ReactNode) => (
    <>
      {chrome}
      {body}
    </>
  );

  if (view.kind === "loading") return withChrome(<ResultSkeleton />);

  if (view.kind === "exhausted") {
    return withChrome(<QuotaExhaustedCard locale={locale} mode={view.mode} />);
  }

  if (view.kind === "insufficient") {
    return withChrome(<InsufficientCard locale={locale} onReset={reset} />);
  }

  if (view.kind === "result" && view.data.result.status === "ok") {
    const r = view.data.result;
    return withChrome(
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
        trend={r.trend}
        specialtyName={specialties.find((s) => s.slug === specialty)?.label}
        cityName={cities.find((c) => c.slug === city)?.label}
        canShare={canShare}
        isAuthed={isAuthed}
        onReset={reset}
      />
    );
  }

  return withChrome(
    <form
      onSubmit={onSubmit}
      className="card-wahaj p-7 sm:p-10 space-y-6 animate-fade-in"
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
        <p role="alert" className={`text-sm text-[var(--over)] ${font}`}>
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
  const tCommon = useTranslations("Common");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-sm font-medium text-rizq-ink mb-2 ${font}`}
      >
        {label}
      </label>
      <Combobox
        id={id}
        locale={locale}
        value={value || null}
        onChange={(v) => onChange(v ?? "")}
        options={options.map((o) => ({ value: o.slug, label: o.label, hint: o.hint }))}
        placeholder={placeholder}
        // The visible <label> can't name a role=combobox trigger (it isn't a
        // labelable element), and Combobox otherwise falls back to the
        // placeholder — so a screen reader would announce "Pick your level"
        // for a field visibly labelled "Years of experience" (WCAG 2.5.3,
        // Label in Name). Name it from the visible label instead.
        aria-label={label}
        searchPlaceholder={tCommon("combobox.searchPlaceholder")}
        emptyText={tCommon("combobox.noResults")}
      />
    </div>
  );
}
