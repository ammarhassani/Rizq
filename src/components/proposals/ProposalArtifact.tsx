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
      // new document model
      cover: "عرض مشروع",
      cover_letter: "خطاب تقديمي",
      understanding: "فهم المتطلبات",
      approach: "منهجية العمل",
      scope_of_work: "نطاق العمل",
      assumptions: "الافتراضات والاستثناءات",
      timeline: "الجدول الزمني",
      pricing: "التسعير",
      milestones: "مراحل الدفع",
      about: "نبذة عن المستقل",
      terms: "الشروط والأحكام",
      next_steps: "الخطوات التالية",
      verification: "التحقق",
      // legacy
      branding: "المقدم",
      client_ref: "مُقدَّم إلى",
      ip_terms: "الملكية الفكرية",
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
    // --- honesty badge (non-removable on AI-drafted prose) ---
    aiBadge: "صيغت بالذكاء الاصطناعي، راجِعها قبل الإرسال",
    // --- cover ---
    coverDocLabel: "عرض مشروع",
    preparedFor: "مُقدَّم إلى",
    issuedOn: "تاريخ الإصدار",
    // --- cover letter (templated default) ---
    coverLetterDefault: (client: string) =>
      `نشكر ${client} على إتاحة الفرصة لتقديم هذا العرض. يسعدنا أن نضع خبرتنا في خدمة هذا المشروع، ونقدّم فيما يلي تصوّرًا واضحًا للنطاق والجدول الزمني والاستثمار المقترح. نتطلّع إلى التعاون معكم لتحقيق النتائج المرجوّة.`,
    // --- understanding (templated default) ---
    understandingDefault:
      "يعكس النطاق التالي المتطلبات التي عبّر عنها العميل، وقد جرت صياغته بناءً على المعطيات المتاحة حتى تاريخه. نرحّب بأي توضيح إضافي لضمان توافق العرض الكامل مع التطلّعات.",
    // --- approach (templated default phases) ---
    approachDefault: [
      { title: "الاستكشاف والمواءمة", body: "مراجعة المتطلبات والاتفاق على الأهداف والمخرجات قبل البدء." },
      { title: "التنفيذ", body: "إنجاز العمل وفق النطاق المتفق عليه مع تحديثات دورية للتقدّم." },
      { title: "المراجعة والتسليم", body: "مراجعة المخرجات وإجراء التعديلات المتفق عليها ثم التسليم النهائي." },
    ] as { title: string; body: string }[],
    // --- scope ---
    scopeDeliverables: "المخرجات",
    // --- assumptions (templated defaults) ---
    assumptionsTitle: "الافتراضات",
    exclusionsTitle: "الاستثناءات",
    assumptionsDefault: [
      "تقديم العميل للملاحظات والموافقات في الوقت المناسب.",
      "الالتزام بعدد المراجعات المتفق عليه ضمن النطاق.",
      "توفير المحتوى والمواد اللازمة من جهة العميل عند الحاجة.",
    ],
    exclusionsDefault: [
      "تكاليف الأطراف الثالثة (تراخيص، خطوط، صور، استضافة).",
      "الصيانة أو الدعم المستمر بعد التسليم النهائي.",
    ],
    // --- pricing ---
    included: "يشمل السعر",
    depositLabel: (pct: number) => `دفعة مقدمة ${pct}%`,
    // --- about ---
    yearsExp: "سنوات الخبرة",
    projectsDone: "مشروع منجز",
    notableClientsLabel: "عملاء سابقون",
    portfolioLabel: "أعمال مختارة",
    testimonialsLabel: "آراء العملاء",
    // --- terms ---
    termsPayment: "الدفع",
    termsPaymentClause: (deposit: number, remainder: number) =>
      `يُستحق ${deposit}% كدفعة مقدمة عند بدء العمل، و${remainder}% المتبقية عند التسليم النهائي.`,
    termsRevisions: "المراجعات",
    termsRevisionsClause: (n: number) =>
      `يشمل العرض ${n} مراجعات ضمن النطاق المتفق عليه؛ تُحتسب المراجعات الإضافية بشكل منفصل.`,
    termsRevisionsClauseNone:
      "يُتفق على عدد المراجعات المشمولة قبل بدء العمل؛ تُحتسب المراجعات الإضافية بشكل منفصل.",
    termsIp: "الملكية الفكرية",
    termsConfidentiality: "السرّية",
    termsConfidentialityClause:
      "يلتزم الطرفان بالحفاظ على سرّية المعلومات المتبادلة وعدم إفشائها لأي طرف ثالث دون إذن خطّي.",
    termsValidity: "صلاحية العرض",
    termsValidityClause: (n: number) =>
      `هذا العرض صالح لمدة ${n} يومًا من تاريخ إصداره.`,
    termsCancellation: "الإلغاء",
    termsCancellationClause:
      "في حال إلغاء المشروع بعد البدء، تُستحق قيمة العمل المنجز حتى تاريخ الإلغاء وتُعدّ الدفعة المقدمة غير قابلة للاسترداد.",
    // --- next steps ---
    nextStepsCta:
      "للمضيّ قُدُمًا، يرجى تأكيد الموافقة على هذا العرض وسنبدأ فورًا بترتيب الخطوات الأولى.",
    acceptanceBlock: "إقرار القبول",
    clientName: "اسم العميل",
    signature: "التوقيع",
    date: "التاريخ",
    contactLabel: "للتواصل",
  },
  en: {
    sections: {
      // new document model
      cover: "Project Proposal",
      cover_letter: "Cover Letter",
      understanding: "Understanding of Requirements",
      approach: "Our Approach",
      scope_of_work: "Scope of Work",
      assumptions: "Assumptions & Exclusions",
      timeline: "Timeline",
      pricing: "Pricing",
      milestones: "Payment Milestones",
      about: "About the Freelancer",
      terms: "Terms & Conditions",
      next_steps: "Next Steps",
      verification: "Verification",
      // legacy
      branding: "Submitted by",
      client_ref: "Prepared for",
      ip_terms: "Intellectual Property",
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
    // --- honesty badge ---
    aiBadge: "AI-drafted, review before sending",
    // --- cover ---
    coverDocLabel: "Project Proposal",
    preparedFor: "Prepared for",
    issuedOn: "Issued on",
    // --- cover letter (templated default) ---
    coverLetterDefault: (client: string) =>
      `Thank you, ${client}, for the opportunity to submit this proposal. We are glad to bring our expertise to this project and outline below a clear view of the scope, timeline, and proposed investment. We look forward to collaborating with you to achieve the results you are aiming for.`,
    // --- understanding (templated default) ---
    understandingDefault:
      "The scope set out below reflects the requirements as stated by the client and has been prepared from the information available to date. We welcome any further clarification to ensure the full proposal aligns with your expectations.",
    // --- approach (templated default phases) ---
    approachDefault: [
      { title: "Discovery & alignment", body: "Review requirements and agree on goals and deliverables before starting." },
      { title: "Execution", body: "Deliver the work per the agreed scope with regular progress updates." },
      { title: "Review & handover", body: "Review the deliverables, apply agreed revisions, then hand over the final work." },
    ] as { title: string; body: string }[],
    // --- scope ---
    scopeDeliverables: "Deliverables",
    // --- assumptions (templated defaults) ---
    assumptionsTitle: "Assumptions",
    exclusionsTitle: "Exclusions",
    assumptionsDefault: [
      "The client provides feedback and approvals in a timely manner.",
      "Work stays within the agreed number of revisions.",
      "Required content and materials are supplied by the client when needed.",
    ],
    exclusionsDefault: [
      "Third-party costs (licences, fonts, imagery, hosting).",
      "Ongoing maintenance or support after final delivery.",
    ],
    // --- pricing ---
    included: "Price includes",
    depositLabel: (pct: number) => `${pct}% deposit`,
    // --- about ---
    yearsExp: "Years of experience",
    projectsDone: "Projects completed",
    notableClientsLabel: "Past clients",
    portfolioLabel: "Selected work",
    testimonialsLabel: "What clients say",
    // --- terms ---
    termsPayment: "Payment",
    termsPaymentClause: (deposit: number, remainder: number) =>
      `${deposit}% is due as a deposit upon project start, with the remaining ${remainder}% due on final delivery.`,
    termsRevisions: "Revisions",
    termsRevisionsClause: (n: number) =>
      `This proposal includes ${n} revisions within the agreed scope; additional revisions are billed separately.`,
    termsRevisionsClauseNone:
      "The number of included revisions is agreed before work begins; additional revisions are billed separately.",
    termsIp: "Intellectual Property",
    termsConfidentiality: "Confidentiality",
    termsConfidentialityClause:
      "Both parties agree to keep shared information confidential and not to disclose it to any third party without written consent.",
    termsValidity: "Validity",
    termsValidityClause: (n: number) =>
      `This proposal is valid for ${n} days from its issue date.`,
    termsCancellation: "Cancellation",
    termsCancellationClause:
      "If the project is cancelled after it begins, work completed up to the cancellation date is payable and the deposit is non-refundable.",
    // --- next steps ---
    nextStepsCta:
      "To proceed, please confirm your acceptance of this proposal and we will begin arranging the first steps right away.",
    acceptanceBlock: "Acceptance",
    clientName: "Client name",
    signature: "Signature",
    date: "Date",
    contactLabel: "Contact",
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

// --- Honesty badge (non-removable; shown on AI-drafted prose) ---
function AiBadge({ locale }: { locale: "ar" | "en" }) {
  const t = T[locale];
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <span
      className={`mb-3 inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/40 bg-rizq-gold/10 px-2.5 py-1 text-[10px] font-medium text-rizq-gold-dark ${font}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-rizq-gold-dark" />
      {t.aiBadge}
    </span>
  );
}

// --- Cover (document title block) ---
function CoverSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const projectTitle = str(c["projectTitle"], t.coverDocLabel);
  const clientName = str(c["clientName"], t.noClient);
  const issueDate = str(c["issueDate"] as string | null | undefined);
  const validityDays = num(c["validityDays"], 30);
  const brandName = str(c["brandName"]);
  const logoUrl = str(c["logoUrl"]);
  const tagline = str(c["tagline"]);
  const colors = (c["colors"] as { primary?: string; secondary?: string } | null) ?? {};
  const primaryColor = str(colors.primary, "#1A5F3F");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SectionShell title={t.sections.cover} accent={primaryColor}>
      <div dir={dir}>
        {/* Brand row */}
        <div className="flex items-center gap-3">
          {logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoUrl}
              alt={brandName}
              width={48}
              height={48}
              className="rounded-xl object-contain border border-rizq-gold/20 shrink-0"
            />
          )}
          {brandName && (
            <div className="min-w-0">
              <p
                className={`text-lg font-bold leading-tight ${font}`}
                style={{ color: primaryColor }}
              >
                {brandName}
              </p>
              {tagline && (
                <p className={`text-xs text-rizq-ink-soft ${font}`}>{tagline}</p>
              )}
            </div>
          )}
        </div>

        {/* Document title */}
        <p
          className={`mt-5 text-3xl sm:text-4xl font-bold text-rizq-ink leading-tight ${font}`}
        >
          {projectTitle}
        </p>

        {/* Meta line */}
        <div
          className={`mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-rizq-ink-soft ${font}`}
        >
          <span>
            {t.preparedFor}:{" "}
            <span className="text-rizq-ink font-medium">{clientName}</span>
          </span>
          {issueDate && (
            <span>
              {t.issuedOn}:{" "}
              <span className="text-rizq-ink font-medium">
                {fmtDate(issueDate, locale)}
              </span>
            </span>
          )}
          <span>
            {t.validUntil}:{" "}
            <span className="text-rizq-ink font-medium">
              {t.validityDays(validityDays)}
            </span>
          </span>
        </div>
      </div>
    </SectionShell>
  );
}

// --- Cover letter (prose; templated default when body null) ---
function CoverLetterSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const aiGenerated = c["ai_generated"] === true;
  const rawBody = typeof c["body"] === "string" ? (c["body"] as string) : null;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Default prose references only the real client name — never invents specifics.
  const clientName = str(c["clientName"], t.noClient);
  const body = rawBody && rawBody.length > 0 ? rawBody : t.coverLetterDefault(clientName);
  // Badge only when content is genuinely AI-drafted (never on the templated default).
  const showBadge = aiGenerated && rawBody != null;

  return (
    <SectionShell title={t.sections.cover_letter}>
      {showBadge && <AiBadge locale={locale} />}
      <p className={`text-sm text-rizq-ink leading-relaxed whitespace-pre-line ${font}`}>
        {body}
      </p>
    </SectionShell>
  );
}

// --- Understanding (prose; templated default when body null) ---
function UnderstandingSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const aiGenerated = c["ai_generated"] === true;
  const rawBody = typeof c["body"] === "string" ? (c["body"] as string) : null;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const body = rawBody && rawBody.length > 0 ? rawBody : t.understandingDefault;
  const showBadge = aiGenerated && rawBody != null;

  return (
    <SectionShell title={t.sections.understanding}>
      {showBadge && <AiBadge locale={locale} />}
      <p className={`text-sm text-rizq-ink leading-relaxed whitespace-pre-line ${font}`}>
        {body}
      </p>
    </SectionShell>
  );
}

// --- Approach (phases; templated default when phases null) ---
function ApproachSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const aiGenerated = c["ai_generated"] === true;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const rawPhases = Array.isArray(c["phases"])
    ? (c["phases"] as unknown[])
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .map((p) => ({
          title: str(p["title"]),
          body: str(p["body"]),
        }))
        .filter((p) => p.title.length > 0 || p.body.length > 0)
    : null;

  const hasReal = rawPhases !== null && rawPhases.length > 0;
  const phases: { title: string; body: string }[] =
    rawPhases && rawPhases.length > 0 ? rawPhases : t.approachDefault;
  const showBadge = aiGenerated && hasReal;

  return (
    <SectionShell title={t.sections.approach}>
      {showBadge && <AiBadge locale={locale} />}
      <ol className="space-y-4">
        {phases.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rizq-green/10 text-xs font-semibold text-rizq-green tabular"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              {p.title && (
                <p className={`text-sm font-semibold text-rizq-ink ${font}`}>{p.title}</p>
              )}
              {p.body && (
                <p className={`mt-0.5 text-sm text-rizq-ink-soft leading-relaxed ${font}`}>
                  {p.body}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

// --- Assumptions & exclusions (templated defaults when null) ---
function AssumptionsSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const aiGenerated = c["ai_generated"] === true;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const rawAssumptions = Array.isArray(c["assumptions"])
    ? (c["assumptions"] as unknown[]).filter((v): v is string => typeof v === "string")
    : null;
  const rawExclusions = Array.isArray(c["exclusions"])
    ? (c["exclusions"] as unknown[]).filter((v): v is string => typeof v === "string")
    : null;

  const hasReal =
    (rawAssumptions !== null && rawAssumptions.length > 0) ||
    (rawExclusions !== null && rawExclusions.length > 0);

  const assumptions =
    rawAssumptions && rawAssumptions.length > 0 ? rawAssumptions : t.assumptionsDefault;
  const exclusions =
    rawExclusions && rawExclusions.length > 0 ? rawExclusions : t.exclusionsDefault;
  const showBadge = aiGenerated && hasReal;

  return (
    <SectionShell title={t.sections.assumptions}>
      {showBadge && <AiBadge locale={locale} />}
      <div className="space-y-4">
        <div>
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
            {t.assumptionsTitle}
          </p>
          <ul className={`space-y-1.5 ${font}`}>
            {assumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rizq-ink">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rizq-green" />
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
            {t.exclusionsTitle}
          </p>
          <ul className={`space-y-1.5 ${font}`}>
            {exclusions.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rizq-ink-soft">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rizq-gold/60" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
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
  const aiGenerated = c["ai_generated"] === true;
  const description = str(c["description"], t.noDescription);
  const deliverables = Array.isArray(c["deliverables"])
    ? (c["deliverables"] as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  const descriptions = Array.isArray(c["deliverable_descriptions"])
    ? (c["deliverable_descriptions"] as unknown[]).map((d) =>
        typeof d === "string" ? d : ""
      )
    : null;
  const revisions = typeof c["revisions"] === "number" ? c["revisions"] : null;
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  // Badge only fires once AI has produced deliverable descriptions.
  const showBadge =
    aiGenerated && descriptions !== null && descriptions.some((d) => d.length > 0);

  return (
    <SectionShell title={t.sections.scope_of_work}>
      {showBadge && <AiBadge locale={locale} />}
      {description !== t.noDescription && (
        <p className={`text-sm text-rizq-ink leading-relaxed mb-4 ${font}`}>{description}</p>
      )}
      {deliverables.length > 0 ? (
        <ul className={`space-y-2 ${font}`}>
          {deliverables.map((d, i) => {
            const desc = descriptions?.[i];
            return (
              <li key={i} className="flex items-start gap-2 text-sm text-rizq-ink">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rizq-green"
                />
                <span className="min-w-0">
                  <span className="font-medium">{d}</span>
                  {desc && desc.length > 0 && (
                    <span className={`block text-xs text-rizq-ink-soft leading-relaxed ${font}`}>
                      {desc}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
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
  const included = Array.isArray(c["included"])
    ? (c["included"] as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  const depositPct =
    typeof c["depositPct"] === "number" ? (c["depositPct"] as number) : null;
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

      {/* What the price includes (only when provided) */}
      {included.length > 0 && (
        <div className="mb-4">
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
            {t.included}
          </p>
          <ul className={`space-y-1.5 ${font}`}>
            {included.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rizq-ink">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rizq-green" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deposit hint */}
      {depositPct !== null && depositPct > 0 && depositPct < 100 && (
        <p className={`mb-4 text-xs text-rizq-ink-soft ${font}`}>{t.depositLabel(depositPct)}</p>
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

// --- About (freelancer profile) ---
function AboutSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const bioAr = typeof c["bioAr"] === "string" ? (c["bioAr"] as string) : null;
  const bioEn = typeof c["bioEn"] === "string" ? (c["bioEn"] as string) : null;
  const bio = locale === "ar" ? bioAr ?? bioEn : bioEn ?? bioAr;

  const yearsExperience =
    typeof c["yearsExperience"] === "number" ? (c["yearsExperience"] as number) : null;
  const totalProjects =
    typeof c["totalProjectsCompleted"] === "number"
      ? (c["totalProjectsCompleted"] as number)
      : null;

  const notableClients = Array.isArray(c["notableClients"])
    ? (c["notableClients"] as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  const portfolio = Array.isArray(c["portfolioSamples"])
    ? (c["portfolioSamples"] as unknown[])
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .map((p) => ({
          title: str(p["title"]),
          url: typeof p["url"] === "string" ? (p["url"] as string) : null,
          description: typeof p["description"] === "string" ? (p["description"] as string) : null,
        }))
        .filter((p) => p.title.length > 0 || p.description !== null)
    : [];

  const testimonials = Array.isArray(c["testimonials"])
    ? (c["testimonials"] as unknown[])
        .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
        .map((q) => ({
          clientName: typeof q["clientName"] === "string" ? (q["clientName"] as string) : null,
          clientTitle: typeof q["clientTitle"] === "string" ? (q["clientTitle"] as string) : null,
          quoteAr: typeof q["quoteAr"] === "string" ? (q["quoteAr"] as string) : null,
          quoteEn: typeof q["quoteEn"] === "string" ? (q["quoteEn"] as string) : null,
          rating: typeof q["rating"] === "number" ? (q["rating"] as number) : null,
        }))
        .filter((q) => (locale === "ar" ? q.quoteAr ?? q.quoteEn : q.quoteEn ?? q.quoteAr))
    : [];

  const hasStats = yearsExperience !== null || totalProjects !== null;

  // If ALL about-data is empty, render nothing (no hollow section).
  const isEmpty =
    !bio &&
    !hasStats &&
    notableClients.length === 0 &&
    portfolio.length === 0 &&
    testimonials.length === 0;
  if (isEmpty) return null;

  return (
    <SectionShell title={t.sections.about}>
      <div className="space-y-5">
        {bio && (
          <p className={`text-sm text-rizq-ink leading-relaxed whitespace-pre-line ${font}`}>
            {bio}
          </p>
        )}

        {hasStats && (
          <div className="flex flex-wrap gap-6">
            {yearsExperience !== null && (
              <div>
                <p className="tabular font-sans text-2xl font-semibold text-rizq-green leading-none">
                  {yearsExperience}
                </p>
                <p className={`mt-0.5 text-xs text-rizq-ink-soft ${font}`}>{t.yearsExp}</p>
              </div>
            )}
            {totalProjects !== null && (
              <div>
                <p className="tabular font-sans text-2xl font-semibold text-rizq-green leading-none">
                  {totalProjects}
                </p>
                <p className={`mt-0.5 text-xs text-rizq-ink-soft ${font}`}>{t.projectsDone}</p>
              </div>
            )}
          </div>
        )}

        {notableClients.length > 0 && (
          <div>
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
              {t.notableClientsLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {notableClients.map((cli, i) => (
                <span
                  key={i}
                  className={`rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-3 py-1 text-xs text-rizq-ink ${font}`}
                >
                  {cli}
                </span>
              ))}
            </div>
          </div>
        )}

        {portfolio.length > 0 && (
          <div>
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
              {t.portfolioLabel}
            </p>
            <ul className={`space-y-2 ${font}`}>
              {portfolio.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-rizq-ink">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rizq-green" />
                  <span className="min-w-0">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-rizq-green hover:underline"
                      >
                        {p.title || p.url}
                      </a>
                    ) : (
                      <span className="font-medium">{p.title}</span>
                    )}
                    {p.description && (
                      <span className={`block text-xs text-rizq-ink-soft leading-relaxed ${font}`}>
                        {p.description}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {testimonials.length > 0 && (
          <div>
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
              {t.testimonialsLabel}
            </p>
            <div className="space-y-3">
              {testimonials.map((q, i) => {
                const quote = locale === "ar" ? q.quoteAr ?? q.quoteEn : q.quoteEn ?? q.quoteAr;
                const rating =
                  q.rating !== null ? Math.max(0, Math.min(5, Math.round(q.rating))) : null;
                return (
                  <figure
                    key={i}
                    className="rounded-xl border border-rizq-gold/15 bg-rizq-cream/40 px-4 py-3"
                  >
                    {rating !== null && (
                      <p aria-hidden className="mb-1 text-sm text-rizq-gold-dark tracking-wide">
                        {"★".repeat(rating)}
                        <span className="text-rizq-gold/30">{"★".repeat(5 - rating)}</span>
                      </p>
                    )}
                    <blockquote className={`text-sm text-rizq-ink leading-relaxed ${font}`}>
                      “{quote}”
                    </blockquote>
                    {(q.clientName || q.clientTitle) && (
                      <figcaption className={`mt-1.5 text-xs text-rizq-ink-soft ${font}`}>
                        {[q.clientName, q.clientTitle].filter(Boolean).join(" · ")}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// --- Terms (expanded bilingual clauses) ---
function TermsSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const ipTerms = str(c["ipTerms"]);
  const depositPct = num(c["depositPct"], 50);
  const remainder = 100 - depositPct;
  const revisions = typeof c["revisions"] === "number" ? (c["revisions"] as number) : null;
  const validityDays = num(c["validityDays"], 30);

  function ipText(): string {
    if (ipTerms === "full_transfer") return t.ipFull;
    if (ipTerms === "license") return t.ipLicense;
    if (ipTerms === "per_project") return t.ipPerProject;
    return t.ipFull;
  }

  const clauses: { label: string; body: string }[] = [
    { label: t.termsPayment, body: t.termsPaymentClause(depositPct, remainder) },
    {
      label: t.termsRevisions,
      body:
        revisions !== null && revisions > 0
          ? t.termsRevisionsClause(revisions)
          : t.termsRevisionsClauseNone,
    },
    { label: t.termsIp, body: ipText() },
    { label: t.termsConfidentiality, body: t.termsConfidentialityClause },
    { label: t.termsValidity, body: t.termsValidityClause(validityDays) },
    { label: t.termsCancellation, body: t.termsCancellationClause },
  ];

  return (
    <SectionShell title={t.sections.terms}>
      <ol className="space-y-3">
        {clauses.map((cl, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 shrink-0 text-xs font-semibold text-rizq-gold-dark tabular"
            >
              {i + 1}.
            </span>
            <p className={`text-sm text-rizq-ink leading-relaxed ${font}`}>
              <span className="font-semibold">{cl.label}: </span>
              {cl.body}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

// --- Next steps (CTA + acceptance / signature block) ---
function NextStepsSection({
  section,
  locale,
}: {
  section: ArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const validityDays = num(c["validityDays"], 30);
  const freelancerName = str(c["freelancerName"]);
  const contact = (c["contact"] as {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null) ?? {};

  return (
    <SectionShell title={t.sections.next_steps}>
      <p className={`text-sm text-rizq-ink leading-relaxed ${font}`}>{t.nextStepsCta}</p>

      <p className={`mt-3 text-xs text-rizq-ink-soft ${font}`}>
        {t.termsValidityClause(validityDays)}
      </p>

      {/* Acceptance / signature block */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Freelancer side */}
        <div>
          <p className={`mb-1 text-xs font-semibold uppercase tracking-wide text-rizq-gold-dark ${font}`}>
            {t.acceptanceBlock}
          </p>
          {freelancerName && (
            <p className={`text-sm font-medium text-rizq-ink ${font}`}>{freelancerName}</p>
          )}
          <div className={`mt-3 space-y-3 text-xs text-rizq-ink-soft ${font}`}>
            {contact.email && (
              <p>
                {t.contactLabel}:{" "}
                <a href={`mailto:${contact.email}`} className="text-rizq-green hover:underline">
                  {contact.email}
                </a>
              </p>
            )}
            {contact.whatsapp && (
              <p>
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rizq-green hover:underline"
                >
                  WhatsApp: {contact.whatsapp}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Client signature side */}
        <div className={`space-y-4 text-xs text-rizq-ink-soft ${font}`}>
          <div>
            <p className="mb-4">{t.clientName}</p>
            <span aria-hidden className="block border-b border-rizq-ink/30" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-4">{t.signature}</p>
              <span aria-hidden className="block border-b border-rizq-ink/30" />
            </div>
            <div>
              <p className="mb-4">{t.date}</p>
              <span aria-hidden className="block border-b border-rizq-ink/30" />
            </div>
          </div>
        </div>
      </div>
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
  const label = str(c["label"], "Generated by Rizq, the Saudi Freelancer OS");
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
    // --- new document model ---
    case "cover":
      return <CoverSection key={section.id} section={section} locale={locale} />;
    case "cover_letter":
      return <CoverLetterSection key={section.id} section={section} locale={locale} />;
    case "understanding":
      return <UnderstandingSection key={section.id} section={section} locale={locale} />;
    case "approach":
      return <ApproachSection key={section.id} section={section} locale={locale} />;
    case "scope_of_work":
      return <ScopeSection key={section.id} section={section} locale={locale} />;
    case "assumptions":
      return <AssumptionsSection key={section.id} section={section} locale={locale} />;
    case "timeline":
      return <TimelineSection key={section.id} section={section} locale={locale} />;
    case "pricing":
      return <PricingSection key={section.id} section={section} locale={locale} />;
    case "milestones":
      return <MilestonesSection key={section.id} section={section} locale={locale} />;
    case "about":
      return <AboutSection key={section.id} section={section} locale={locale} />;
    case "terms":
      return <TermsSection key={section.id} section={section} locale={locale} />;
    case "next_steps":
      return <NextStepsSection key={section.id} section={section} locale={locale} />;
    // --- legacy (backward-compat with stored artifacts) ---
    case "branding":
      return <BrandingSection key={section.id} section={section} locale={locale} />;
    case "client_ref":
      return <ClientRefSection key={section.id} section={section} locale={locale} />;
    case "ip_terms":
      return <IpTermsSection key={section.id} section={section} locale={locale} />;
    case "terms_footer":
      return <TermsFooterSection key={section.id} section={section} locale={locale} />;
    case "verification":
      return <VerificationSection key={section.id} section={section} locale={locale} />;
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
      <div className="space-y-4 sm:space-y-5">
        {/* New document model leads with the cover (its own print page); legacy
            artifacts pair branding + client_ref side-by-side. */}
        {(() => {
          const brandingIdx = sections.findIndex((s) => s.id === "branding");
          const clientIdx = sections.findIndex((s) => s.id === "client_ref");
          const hasLegacyHeader = brandingIdx !== -1 && clientIdx !== -1;

          if (hasLegacyHeader) {
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

          return sections.map((s) =>
            s.id === "cover" ? (
              <div key={s.id} className="proposal-cover-page">
                {renderSection(s, locale)}
              </div>
            ) : (
              renderSection(s, locale)
            )
          );
        })()}
      </div>

      {/* Brand footer — repeats on every printed page (hidden on screen) */}
      <p className="proposal-print-footer" aria-hidden>
        رِزق · Rizq
      </p>
    </div>
  );
}
