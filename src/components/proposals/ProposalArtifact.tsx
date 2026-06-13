/**
 * ProposalArtifact — Phase-2 task 2.8
 *
 * Presentational-only server-safe component.
 * Renders the 9 ArtifactData sections in order.
 * No data fetching, no hooks that require a client boundary.
 * Client components (AnimatedNumber) are intentionally avoided so
 * this tree can be SSR'd without a "use client" wrapper.
 */

import { Link } from "@/i18n/navigation";
import { RizqSeal } from "@/components/proposals/RizqSeal";
import type { ArtifactData, ArtifactSection } from "@/lib/proposals/artifact";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  data: ArtifactData;
  locale: "ar" | "en";
};

// ---------------------------------------------------------------------------
// i18n strings (inline — avoids "use client" / async boundary for translations
// in a deeply nested tree; the share page passes locale down).
// ---------------------------------------------------------------------------

const T = {
  ar: {
    sections: {
      branding: "المقدم",
      client_ref: "مُقدَّم إلى",
      scope_of_work: "نطاق العمل",
      pricing: "التسعير",
      milestones: "مراحل الدفع",
      timeline: "الجدول الزمني",
      ip_terms: "الملكية الفكرية",
      verification: "التحقق",
      terms_footer: "الشروط العامة",
    },
    currency: "ريال",
    revisionsCount: (n: number) => `${n} مراجعات`,
    deposit: "دفعة مقدمة",
    delivery: "عند التسليم",
    startDate: "تاريخ البدء",
    deliveryDate: "تاريخ التسليم",
    validUntil: "صالح حتى",
    validityDays: (n: number) => `${n} يومًا`,
    jurisdiction: "الاختصاص القضائي",
    ksa: "المملكة العربية السعودية",
    ipFull: "تنتقل كامل حقوق الملكية الفكرية للعميل عند اكتمال الدفع.",
    ipLicense: "يحتفظ المستقل بحقوق الملكية الفكرية ويمنح العميل ترخيصًا للاستخدام.",
    ipPerProject: "تُحدَّد حقوق الملكية الفكرية لكل مشروع وفق الاتفاق الخاص به.",
    proposalId: "رقم العرض",
    methodologyLink: "كيف نحسب هذا السعر؟",
    anchor: "السعر المقترح",
    priceRange: "النطاق السعري",
    min: "الأدنى",
    max: "الأعلى",
    citation: "المصدر",
    noClient: "عميل محترم",
    noDescription: "—",
    noDeliverables: "سيُحدَّد النطاق الكامل عند توقيع العقد.",
    noDates: "يُتفق عليه",
    triggerDeposit: "دفعة مقدمة عند البدء",
    triggerDelivery: "عند استلام التسليم النهائي",
    ofTotal: "من الإجمالي",
  },
  en: {
    sections: {
      branding: "Submitted by",
      client_ref: "Prepared for",
      scope_of_work: "Scope of Work",
      pricing: "Pricing",
      milestones: "Payment Milestones",
      timeline: "Timeline",
      ip_terms: "Intellectual Property",
      verification: "Verification",
      terms_footer: "Terms",
    },
    currency: "SAR",
    revisionsCount: (n: number) => `${n} revisions`,
    deposit: "Deposit",
    delivery: "On delivery",
    startDate: "Start date",
    deliveryDate: "Delivery date",
    validUntil: "Valid until",
    validityDays: (n: number) => `${n} days`,
    jurisdiction: "Jurisdiction",
    ksa: "Kingdom of Saudi Arabia",
    ipFull: "All intellectual property rights transfer to the client upon full payment.",
    ipLicense: "The freelancer retains IP rights and grants the client a usage licence.",
    ipPerProject: "IP rights are defined per-project in a separate agreement.",
    proposalId: "Proposal ID",
    methodologyLink: "How is this price calculated?",
    anchor: "Proposed price",
    priceRange: "Price range",
    min: "Low",
    max: "High",
    citation: "Source",
    noClient: "Valued client",
    noDescription: "—",
    noDeliverables: "Full scope to be defined upon contract signing.",
    noDates: "To be agreed",
    triggerDeposit: "Deposit upon project start",
    triggerDelivery: "Upon receipt of final delivery",
    ofTotal: "of total",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && isFinite(v) ? v : fallback;
}

function fmtPrice(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function SectionShell({
  title,
  children,
  className = "",
  accent,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-rizq-gold/20 bg-white/60 p-6 sm:p-8 break-inside-avoid ${className}`}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
      <h2 className="eyebrow mb-4 text-rizq-green">{title}</h2>
      {children}
    </section>
  );
}

// --- Branding ---
function BrandingSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const brandName = str(c["brandName"] ?? c["name"], str(c["name"]));
  const tagline = str(c["tagline"]);
  const logoUrl = str(c["logoUrl"]);
  const colors = (c["colors"] as { primary?: string; secondary?: string } | null) ?? {};
  const primaryColor = str(colors.primary, "#1A5F3F");
  const contact = (c["contact"] as {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null) ?? {};

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SectionShell title={t.sections.branding} accent={primaryColor}>
      <div dir={dir} className="flex items-start gap-4">
        {logoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl}
            alt={brandName}
            width={64}
            height={64}
            className="rounded-xl object-contain border border-rizq-gold/20 shrink-0"
          />
        )}
        <div className="min-w-0">
          <p
            className={`text-2xl font-bold text-rizq-ink leading-tight ${font}`}
            style={{ color: primaryColor }}
          >
            {brandName}
          </p>
          {tagline && (
            <p className={`mt-1 text-sm text-rizq-ink-soft ${font}`}>{tagline}</p>
          )}
          <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-rizq-ink-soft ${font}`}>
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="hover:text-rizq-green transition-colors"
              >
                {contact.email}
              </a>
            )}
            {contact.phone && <span>{contact.phone}</span>}
            {contact.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                className="hover:text-rizq-green transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: {contact.whatsapp}
              </a>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

// --- Client ref ---
function ClientRefSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const clientName = str(c["clientName"], t.noClient);
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <SectionShell title={t.sections.client_ref}>
      <p className={`text-xl font-semibold text-rizq-ink ${font}`}>{clientName}</p>
    </SectionShell>
  );
}

// --- Scope of work ---
function ScopeSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const description = str(c["description"], t.noDescription);
  const deliverables = Array.isArray(c["deliverables"])
    ? (c["deliverables"] as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  const revisions = typeof c["revisions"] === "number" ? c["revisions"] : null;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <SectionShell title={t.sections.scope_of_work}>
      {description !== t.noDescription && (
        <p className={`text-sm text-rizq-ink leading-relaxed mb-4 ${font}`}>{description}</p>
      )}
      {deliverables.length > 0 ? (
        <ul className={`space-y-2 ${font}`}>
          {deliverables.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-rizq-ink">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rizq-green"
              />
              {d}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`text-sm text-rizq-ink-soft italic ${font}`}>{t.noDeliverables}</p>
      )}
      {revisions !== null && revisions > 0 && (
        <p className={`mt-3 text-xs text-rizq-ink-soft ${font}`}>
          {t.revisionsCount(revisions)}
        </p>
      )}
    </SectionShell>
  );
}

// --- Pricing ---
function PricingSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const anchor = num(c["anchor"]);
  const min = num(c["min"]);
  const max = num(c["max"]);
  const citation = str(c["citation"]);
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const range = max - min;
  const anchorPct = range > 0 ? ((anchor - min) / range) * 100 : 50;

  return (
    <SectionShell title={t.sections.pricing}>
      {/* Anchor — the hero number */}
      <div className="mb-6">
        <p className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark mb-1 ${font}`}>
          {t.anchor}
        </p>
        <p className="tabular font-sans text-5xl sm:text-6xl font-semibold text-rizq-green leading-none">
          {fmtPrice(anchor, locale)}
          <span className={`ms-2 text-base font-normal text-rizq-ink-soft ${font}`}>
            {t.currency}
          </span>
        </p>
      </div>

      {/* Min–max band */}
      {(min > 0 || max > 0) && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-rizq-ink-soft mb-1.5">
            <span className={font}>{t.min}: {fmtPrice(min, locale)} {t.currency}</span>
            <span className={font}>{t.max}: {fmtPrice(max, locale)} {t.currency}</span>
          </div>
          <div className="relative h-2 rounded-full bg-rizq-gold/15 overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-rizq-gold/30 via-rizq-green/40 to-rizq-gold/30 rounded-full"
            />
            <span
              aria-hidden
              className="absolute top-1/2 h-4 w-1 bg-rizq-green rounded-full shadow-[0_0_0_3px_rgba(250,245,236,0.9)]"
              style={{
                left: `${anchorPct}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
          <p className={`mt-1 text-[10px] text-rizq-ink-soft/60 ${font}`}>
            {t.priceRange}
          </p>
        </div>
      )}

      {/* Citation — always rendered per honesty architecture */}
      {citation && (
        <p className={`text-xs text-rizq-ink-soft italic ${font}`}>
          <span className="font-medium not-italic text-rizq-ink-soft/80">{t.citation}: </span>
          {citation}
        </p>
      )}

      <Link
        href="/methodology"
        className={`mt-2 inline-flex items-center gap-1 text-xs text-rizq-gold-dark hover:text-rizq-green transition-colors ${font}`}
      >
        <span>{t.methodologyLink}</span>
        <span className="inline-block rtl:rotate-180">→</span>
      </Link>
    </SectionShell>
  );
}

// --- Milestones ---
function MilestonesSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const milestones = Array.isArray(c["milestones"])
    ? (c["milestones"] as unknown[]).filter(
        (m): m is { pct: number; trigger: string } =>
          typeof m === "object" && m !== null
      )
    : [];
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  function triggerLabel(trigger: string): string {
    if (trigger === "deposit") return t.triggerDeposit;
    if (trigger === "delivery") return t.triggerDelivery;
    return trigger;
  }

  return (
    <SectionShell title={t.sections.milestones}>
      <div className="space-y-3">
        {milestones.map((m, i) => {
          const pct = num(m.pct);
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-rizq-gold/15 bg-rizq-cream/60 px-4 py-3"
            >
              <p className={`text-sm text-rizq-ink ${font}`}>{triggerLabel(m.trigger)}</p>
              <span className="tabular font-sans text-xl font-semibold text-rizq-green">
                {pct}%
                <span className={`ms-1 text-xs font-normal text-rizq-ink-soft ${font}`}>
                  {t.ofTotal}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

// --- Timeline ---
function TimelineSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const startDate = str(c["startDate"] as string | null | undefined);
  const deliveryDate = str(c["deliveryDate"] as string | null | undefined);
  const revisions = typeof c["revisions"] === "number" ? c["revisions"] : null;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <SectionShell title={t.sections.timeline}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className={`text-xs text-rizq-ink-soft/70 mb-0.5 ${font}`}>{t.startDate}</p>
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>
            {startDate ? fmtDate(startDate, locale) : t.noDates}
          </p>
        </div>
        <div>
          <p className={`text-xs text-rizq-ink-soft/70 mb-0.5 ${font}`}>{t.deliveryDate}</p>
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>
            {deliveryDate ? fmtDate(deliveryDate, locale) : t.noDates}
          </p>
        </div>
        {revisions !== null && revisions > 0 && (
          <div className="col-span-2">
            <p className={`text-xs text-rizq-ink-soft ${font}`}>
              {t.revisionsCount(revisions)}
            </p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// --- IP Terms ---
function IpTermsSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const terms = str(c["terms"]);
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  function ipText(): string {
    if (terms === "full_transfer") return t.ipFull;
    if (terms === "license") return t.ipLicense;
    if (terms === "per_project") return t.ipPerProject;
    return terms || t.ipFull;
  }

  return (
    <SectionShell title={t.sections.ip_terms}>
      <p className={`text-sm text-rizq-ink leading-relaxed ${font}`}>{ipText()}</p>
    </SectionShell>
  );
}

// --- Verification ---
function VerificationSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const proposalId = str(c["proposalId"]);
  const label = str(c["label"], "Generated by Rizq — Saudi Freelancer OS");
  const methodologyHref = str(c["methodologyHref"], "/methodology");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <SectionShell title={t.sections.verification}>
      <div className="flex items-center gap-5">
        <RizqSeal size={72} locale={locale} className="shrink-0" />
        <div className="min-w-0">
          <p className={`text-sm font-semibold text-rizq-green ${font}`}>{label}</p>
          {proposalId && (
            <p className={`mt-1 text-xs text-rizq-ink-soft break-all ${font}`}>
              {t.proposalId}: {proposalId}
            </p>
          )}
          <Link
            href={methodologyHref as "/methodology"}
            className={`mt-1.5 inline-flex items-center gap-1 text-xs text-rizq-gold-dark hover:text-rizq-green transition-colors ${font}`}
          >
            <span>{t.methodologyLink}</span>
            <span className="inline-block rtl:rotate-180">→</span>
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}

// --- Terms footer ---
function TermsFooterSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const jurisdiction = str(c["jurisdiction"], "KSA");
  const validityDays = num(c["validityDays"], 30);
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const jurisdictionLabel = jurisdiction === "KSA" ? t.ksa : jurisdiction;

  return (
    <SectionShell title={t.sections.terms_footer}>
      <div className={`flex flex-wrap gap-x-6 gap-y-2 text-sm text-rizq-ink-soft ${font}`}>
        <span>
          {t.jurisdiction}: <span className="text-rizq-ink">{jurisdictionLabel}</span>
        </span>
        <span>
          {t.validUntil}: <span className="text-rizq-ink">{t.validityDays(validityDays)}</span>
        </span>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section dispatcher
// ---------------------------------------------------------------------------

function renderSection(section: ArtifactSection, locale: "ar" | "en") {
  switch (section.id) {
    case "branding":
      return <BrandingSection key={section.id} section={section} locale={locale} />;
    case "client_ref":
      return <ClientRefSection key={section.id} section={section} locale={locale} />;
    case "scope_of_work":
      return <ScopeSection key={section.id} section={section} locale={locale} />;
    case "pricing":
      return <PricingSection key={section.id} section={section} locale={locale} />;
    case "milestones":
      return <MilestonesSection key={section.id} section={section} locale={locale} />;
    case "timeline":
      return <TimelineSection key={section.id} section={section} locale={locale} />;
    case "ip_terms":
      return <IpTermsSection key={section.id} section={section} locale={locale} />;
    case "verification":
      return <VerificationSection key={section.id} section={section} locale={locale} />;
    case "terms_footer":
      return <TermsFooterSection key={section.id} section={section} locale={locale} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ProposalArtifact({ data, locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Sort by order in case storage has them out of order
  const sections = [...data.sections].sort((a, b) => a.order - b.order);

  return (
    <div
      dir={dir}
      className={`w-full max-w-2xl mx-auto print:max-w-none ${font}`}
      id="proposal-artifact"
    >
      {/* Print-only header line */}
      <div className="hidden print:block mb-6 pb-4 border-b border-rizq-gold/30">
        <span className="font-arabic text-xl font-bold text-rizq-green">رِزق</span>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {/* Branding + client_ref side-by-side on desktop */}
        {(() => {
          const brandingIdx = sections.findIndex((s) => s.id === "branding");
          const clientIdx = sections.findIndex((s) => s.id === "client_ref");
          const hasBoth = brandingIdx !== -1 && clientIdx !== -1;

          if (hasBoth) {
            const rest = sections.filter(
              (s) => s.id !== "branding" && s.id !== "client_ref"
            );
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {renderSection(sections[brandingIdx], locale)}
                  {renderSection(sections[clientIdx], locale)}
                </div>
                {rest.map((s) => renderSection(s, locale))}
              </>
            );
          }

          return sections.map((s) => renderSection(s, locale));
        })()}
      </div>
    </div>
  );
}
