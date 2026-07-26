/**
 * InvoiceArtifact — Phase-4 task P4.4
 *
 * Presentational-only server-safe component.
 * Renders the 7 InvoiceArtifactData sections in order.
 * No data fetching, no hooks — safe for SSR with no "use client" wrapper.
 * Mirrors ProposalArtifact.tsx in structure, style, and RTL handling.
 */

import type { InvoiceArtifactData, InvoiceArtifactSection } from "@/lib/invoices/artifact";
import type { InvoiceLineItem } from "@/lib/invoices/items";
// Shared with proposals: stored artifacts substituted Rizq's own tagline for an absent one.
import { ownTagline } from "@/lib/proposals/artifact";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  data: InvoiceArtifactData;
  locale: "ar" | "en";
};

// ---------------------------------------------------------------------------
// Inline i18n strings — avoids "use client" / async boundary in deeply nested
// trees; mirrors ProposalArtifact pattern exactly.
// ---------------------------------------------------------------------------

const T = {
  ar: {
    invoiceTitle: "فاتورة",
    invoiceTitleEn: "INVOICE",
    invoiceNumber: "رقم الفاتورة",
    issueDate: "تاريخ الإصدار",
    dueDate: "تاريخ الاستحقاق",
    billTo: "إلى",
    billToEn: "Bill to",
    noClient: "العميل",
    lineItems: "البنود",
    description: "الوصف",
    colDescription: "البند",
    colQty: "الكمية",
    colUnitPrice: "سعر الوحدة",
    colTotal: "الإجمالي",
    subtotal: "المجموع الفرعي",
    fees: "الرسوم",
    vat: "ضريبة القيمة المضافة",
    vatNotRegistered: "غير خاضعة (غير مسجّل في ضريبة القيمة المضافة)",
    vatNotApplied: "غير مطبّقة على هذه الفاتورة",
    vatNumber: "الرقم الضريبي",
    total: "الإجمالي",
    currency: "ر.س",
    payment: "معلومات الدفع",
    paymentMethod: "طريقة الدفع",
    paymentDetails: "تفاصيل الدفع",
    paymentDue: "الاستحقاق",
    methodLabels: {
      bank_transfer: "تحويل بنكي",
      stc_pay: "STC Pay",
      cash: "نقدًا",
      other: "أخرى",
    } as Record<string, string>,
    footer: "التذييل",
    methodology: "كيف نحسب هذا السعر؟",
    jurisdiction: "الاختصاص القضائي",
    ksa: "المملكة العربية السعودية",
    watermark: "أُنشئت عبر رِزق المجاني · Created with Rizq Free",
    statusLabels: {
      draft: "مسودة",
      sent: "مُرسَلة",
      viewed: "مُطَّلَع عليها",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغاة",
    } as Record<string, string>,
    noDueDate: "غير محدد",
    brandedBy: "صادر عن",
    contactLine: "معلومات التواصل",
  },
  en: {
    invoiceTitle: "Invoice",
    invoiceTitleEn: "INVOICE",
    invoiceNumber: "Invoice #",
    issueDate: "Issue date",
    dueDate: "Due date",
    billTo: "Bill to",
    billToEn: "Bill to",
    noClient: "Client",
    lineItems: "Line items",
    description: "Description",
    colDescription: "Description",
    colQty: "Qty",
    colUnitPrice: "Unit price",
    colTotal: "Total",
    subtotal: "Subtotal",
    fees: "Fees",
    vat: "VAT",
    vatNotRegistered: "Not applicable (not VAT-registered)",
    vatNotApplied: "Not applied to this invoice",
    vatNumber: "VAT registration no.",
    total: "Total",
    currency: "SAR",
    payment: "Payment",
    paymentMethod: "Method",
    paymentDetails: "Details",
    paymentDue: "Due",
    methodLabels: {
      bank_transfer: "Bank transfer",
      stc_pay: "STC Pay",
      cash: "Cash",
      other: "Other",
    } as Record<string, string>,
    footer: "Footer",
    methodology: "How is this price calculated?",
    jurisdiction: "Jurisdiction",
    ksa: "Kingdom of Saudi Arabia",
    watermark: "Created with Rizq Free · أُنشئت عبر رِزق المجاني",
    statusLabels: {
      draft: "Draft",
      sent: "Sent",
      viewed: "Viewed",
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    } as Record<string, string>,
    noDueDate: "Not set",
    brandedBy: "From",
    contactLine: "Contact",
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

function fmtMoney(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    ).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Status badge styles (mirrors GigCard)
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-rizq-ink/8 text-rizq-ink-soft",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-blue-50 text-blue-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  cancelled: "bg-rizq-ink/8 text-rizq-ink-soft",
};

// ---------------------------------------------------------------------------
// Section shell — mirrors ProposalArtifact's SectionShell
// ---------------------------------------------------------------------------

function SectionShell({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-rizq-gold/20 bg-white/60 p-6 sm:p-8 break-inside-avoid ${className}`}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : undefined}
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: branding
// ---------------------------------------------------------------------------

function BrandingSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const brandName = str(c["brandName"] ?? c["freelancerName"], str(c["freelancerName"]));
  const tagline = ownTagline(str(c["tagline"] as string | undefined));
  const logoUrl = str(c["logoUrl"] as string | undefined | null);
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
    <SectionShell accent={primaryColor}>
      <div dir={dir} className="flex items-start gap-4">
        {logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logoUrl}
            alt={brandName}
            width={64}
            height={64}
            className="rounded-xl object-contain border border-rizq-gold/20 shrink-0"
          />
        ) : (
          <div
            aria-hidden
            className="flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center font-arabic text-2xl font-bold text-rizq-cream"
            style={{ background: primaryColor }}
          >
            {brandName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p
            className={`text-2xl font-bold leading-tight ${font}`}
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

// ---------------------------------------------------------------------------
// Section: invoice_meta
// ---------------------------------------------------------------------------

function InvoiceMetaSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const invoiceNumber = str(c["invoiceNumber"] as string | undefined);
  const status = str(c["status"] as string | undefined, "draft");
  const issueDate = str(c["issueDate"] as string | null | undefined);
  const dueDate = str(c["dueDate"] as string | null | undefined);

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const statusLabel = t.statusLabels[status] ?? status;
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  return (
    <SectionShell>
      <div dir={dir} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Hero title */}
          <div className={`flex items-baseline gap-3 flex-wrap ${font}`}>
            <h1 className="font-arabic text-4xl font-bold text-rizq-green leading-none">
              {t.invoiceTitle}
            </h1>
            <span className="font-sans text-lg font-light text-rizq-ink-soft/60 tracking-[0.18em] uppercase">
              {t.invoiceTitleEn}
            </span>
          </div>
          {invoiceNumber && (
            <p className={`mt-2 tabular font-sans text-sm text-rizq-ink-soft ${font}`}>
              <span className="text-rizq-ink-soft/70">{t.invoiceNumber}</span>{" "}
              <span className="font-semibold text-rizq-ink">{invoiceNumber}</span>
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusStyle} ${font}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Dates */}
      <div dir={dir} className="mt-5 pt-4 border-t border-rizq-gold/20 flex flex-wrap gap-6">
        {issueDate && (
          <div>
            <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>{t.issueDate}</p>
            <p className={`text-sm font-medium text-rizq-ink ${font}`}>
              {fmtDate(issueDate, locale)}
            </p>
          </div>
        )}
        <div>
          <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>{t.dueDate}</p>
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>
            {dueDate ? fmtDate(dueDate, locale) : t.noDueDate}
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section: bill_to
// ---------------------------------------------------------------------------

function BillToSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const clientName = str(c["clientName"] as string | null | undefined, t.noClient);
  const clientCompany = str(c["clientCompany"] as string | null | undefined);

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SectionShell>
      <div dir={dir}>
        <p className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark mb-3 ${font}`}>
          <span className="font-arabic">{T.ar.billTo}</span>
          {" · "}
          <span className="font-sans">{T.en.billToEn}</span>
        </p>
        <p className={`text-xl font-semibold text-rizq-ink ${font}`}>{clientName}</p>
        {clientCompany && (
          <p className={`mt-1 text-sm text-rizq-ink-soft ${font}`}>{clientCompany}</p>
        )}
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section: line_items
// ---------------------------------------------------------------------------

function LineItemsSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const description = str(c["description"] as string | null | undefined);
  const rawItems = Array.isArray(c["items"])
    ? (c["items"] as unknown[]).filter(
        (item): item is InvoiceLineItem =>
          typeof item === "object" && item !== null
      )
    : [];

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SectionShell>
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t.lineItems}</h2>

      {description && (
        <p className={`mb-4 text-sm text-rizq-ink-soft leading-relaxed ${font}`}>
          {description}
        </p>
      )}

      {rawItems.length > 0 && (
        <div className="overflow-x-auto -mx-2">
          <table className={`w-full text-sm ${font}`} dir={dir}>
            <thead>
              <tr className="border-b border-rizq-gold/20">
                <th className="py-2 px-2 text-start text-xs font-medium text-rizq-ink-soft/70 uppercase tracking-wide">
                  {t.colDescription}
                </th>
                <th className="py-2 px-2 text-center text-xs font-medium text-rizq-ink-soft/70 uppercase tracking-wide w-16">
                  {t.colQty}
                </th>
                <th className="py-2 px-2 text-end text-xs font-medium text-rizq-ink-soft/70 uppercase tracking-wide">
                  {t.colUnitPrice}
                </th>
                <th className="py-2 px-2 text-end text-xs font-medium text-rizq-ink-soft/70 uppercase tracking-wide">
                  {t.colTotal}
                </th>
              </tr>
            </thead>
            <tbody>
              {rawItems.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-rizq-gold/10 last:border-0"
                >
                  <td className="py-3 px-2 text-rizq-ink leading-snug">
                    {str(item.description)}
                  </td>
                  <td className="py-3 px-2 text-center tabular font-sans text-rizq-ink">
                    {/* Same locale formatter as the money columns — an Arabic invoice must
                        not mix Latin quantities into Arabic-Indic totals. */}
                    {fmtMoney(num(item.quantity), locale)}
                  </td>
                  <td className="py-3 px-2 text-end tabular font-sans text-rizq-ink">
                    {fmtMoney(num(item.unit_price_sar), locale)}
                    <span className={`ms-1 text-xs text-rizq-ink-soft/60 ${font}`}>
                      {t.currency}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-end tabular font-sans font-medium text-rizq-ink">
                    {fmtMoney(num(item.total_sar), locale)}
                    <span className={`ms-1 text-xs text-rizq-ink-soft/60 ${font}`}>
                      {t.currency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section: totals
// ---------------------------------------------------------------------------

function TotalsSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const subtotal = num(c["subtotal_sar"] as number | undefined);
  const vatPct = num(c["vat_pct"] as number | undefined);
  const vatSar = num(c["vat_sar"] as number | undefined);
  const total = num(c["total_sar"] as number | undefined);
  const vatNumber = str(c["vat_number"] as string | undefined);
  const fees = Array.isArray(c["fees"])
    ? (c["fees"] as unknown[])
        .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
        .map((f) => ({
          name: str(f["name"]),
          amount_sar: num(f["amount_sar"]),
          isPct: f["fee_type"] === "percentage",
          rate: f["rate"] != null ? num(f["rate"]) : null,
        }))
        .filter((f) => f.name.length > 0)
    : [];

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <SectionShell>
      <div dir={dir} className="space-y-2 max-w-xs ms-auto">
        {/* Subtotal */}
        <div className="flex items-center justify-between gap-4">
          <span className={`text-sm text-rizq-ink-soft ${font}`}>{t.subtotal}</span>
          <span className="tabular font-sans text-sm font-medium text-rizq-ink">
            {fmtMoney(subtotal, locale)}{" "}
            <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t.currency}</span>
          </span>
        </div>

        {/* Fee rows — fixed or percentage; percentage shows its rate */}
        {fees.map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className={`text-sm text-rizq-ink-soft ${font}`}>
              {f.name}
              {f.isPct && f.rate != null && (
                <span className="text-xs text-rizq-ink-soft/50">
                  {" "}({fmtMoney(f.rate, locale)}%)
                </span>
              )}
            </span>
            <span className="tabular font-sans text-sm font-medium text-rizq-ink">
              {fmtMoney(f.amount_sar, locale)}{" "}
              <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t.currency}</span>
            </span>
          </div>
        ))}

        {/* VAT — an invoice with no VAT line reads as an oversight to a Saudi
            client (and to an auditor). State the position either way. */}
        {vatPct <= 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className={`text-sm text-rizq-ink-soft ${font}`}>{t.vat}</span>
            {/* Only claim "not registered" when that is what the profile says. An eligible
                freelancer may still issue a zero-rated or out-of-scope supply. */}
            <span className={`text-xs text-rizq-ink-soft ${font}`}>
              {vatNumber ? t.vatNotApplied : t.vatNotRegistered}
            </span>
          </div>
        )}
        {vatPct > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className={`text-sm text-rizq-ink-soft ${font}`}>
              {/* Through the locale formatter like every other number here — a raw 15
                  printed Latin digits in the middle of an Arabic tax invoice. */}
              {t.vat} ({fmtMoney(vatPct, locale)}%)
            </span>
            <span className="tabular font-sans text-sm font-medium text-rizq-ink">
              {fmtMoney(vatSar, locale)}{" "}
              <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t.currency}</span>
            </span>
          </div>
        )}
        {/* A tax invoice is invalid without the seller's registration number. */}
        {vatPct > 0 && vatNumber && (
          <div className="flex items-center justify-between gap-4">
            <span className={`text-xs text-rizq-ink-soft/70 ${font}`}>{t.vatNumber}</span>
            <span className="tabular font-sans text-xs text-rizq-ink-soft" dir="ltr">
              {vatNumber}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-rizq-gold/25 pt-2">
          <div className="flex items-center justify-between gap-4">
            <span className={`text-base font-semibold text-rizq-ink ${font}`}>{t.total}</span>
            <span className="tabular font-sans text-2xl font-bold text-rizq-green leading-none">
              {fmtMoney(total, locale)}
              <span className={`ms-2 text-sm font-normal text-rizq-ink-soft ${font}`}>
                {t.currency}
              </span>
            </span>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section: payment
// ---------------------------------------------------------------------------

function PaymentSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const paymentMethod = str(c["paymentMethod"] as string | undefined, "bank_transfer");
  const paymentDetails = str(c["paymentDetails"] as string | null | undefined);
  const dueDate = str(c["dueDate"] as string | null | undefined);

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const methodLabel = t.methodLabels[paymentMethod] ?? paymentMethod;

  return (
    <SectionShell>
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t.payment}</h2>
      <div dir={dir} className="flex flex-wrap gap-6">
        <div>
          <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>{t.paymentMethod}</p>
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>{methodLabel}</p>
        </div>
        {dueDate && (
          <div>
            <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>{t.paymentDue}</p>
            <p className={`text-sm font-medium text-rizq-ink ${font}`}>
              {fmtDate(dueDate, locale)}
            </p>
          </div>
        )}
        {paymentDetails && (
          <div className="w-full">
            <p className={`text-xs text-rizq-ink-soft/60 mb-0.5 ${font}`}>{t.paymentDetails}</p>
            <p className={`text-sm text-rizq-ink whitespace-pre-wrap ${font}`}>{paymentDetails}</p>
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section: footer
// ---------------------------------------------------------------------------

function FooterSection({
  section,
  locale,
}: {
  section: InvoiceArtifactSection;
  locale: "ar" | "en";
}) {
  const t = T[locale];
  const c = section.content;
  const watermark = c["watermark"] === true;
  const jurisdiction = str(c["jurisdiction"] as string | undefined, "KSA");
  const methodologyHref = str(c["methodologyHref"] as string | undefined, "/methodology");

  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const jurisdictionLabel = jurisdiction === "KSA" ? t.ksa : jurisdiction;

  return (
    <SectionShell className="bg-rizq-cream/40">
      <div dir={dir} className={`flex flex-wrap items-center justify-between gap-3 ${font}`}>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rizq-ink-soft">
          <span>
            {t.jurisdiction}:{" "}
            <span className="text-rizq-ink">{jurisdictionLabel}</span>
          </span>
          <a
            href={methodologyHref}
            className="hover:text-rizq-green transition-colors"
          >
            {t.methodology} →
          </a>
        </div>

        {/* Watermark badge — free tier only */}
        {watermark && (
          <span
            className={`inline-flex items-center rounded-full border border-rizq-gold/30 bg-rizq-gold/8 px-3 py-1 text-xs text-rizq-ink-soft/70 ${font}`}
          >
            {t.watermark}
          </span>
        )}
      </div>
    </SectionShell>
  );
}

// ---------------------------------------------------------------------------
// Section dispatcher
// ---------------------------------------------------------------------------

function renderSection(section: InvoiceArtifactSection, locale: "ar" | "en") {
  switch (section.id) {
    case "branding":
      return <BrandingSection key={section.id} section={section} locale={locale} />;
    case "invoice_meta":
      return <InvoiceMetaSection key={section.id} section={section} locale={locale} />;
    case "bill_to":
      return <BillToSection key={section.id} section={section} locale={locale} />;
    case "line_items":
      return <LineItemsSection key={section.id} section={section} locale={locale} />;
    case "totals":
      return <TotalsSection key={section.id} section={section} locale={locale} />;
    case "payment":
      return <PaymentSection key={section.id} section={section} locale={locale} />;
    case "footer":
      return <FooterSection key={section.id} section={section} locale={locale} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function InvoiceArtifact({ data, locale }: Props) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  // Sort by order in case storage has them out of order
  const sections = [...data.sections].sort((a, b) => a.order - b.order);

  // Pair branding + bill_to side-by-side on desktop (mirrors ProposalArtifact)
  const brandingIdx = sections.findIndex((s) => s.id === "branding");
  const billToIdx = sections.findIndex((s) => s.id === "bill_to");
  const hasBoth = brandingIdx !== -1 && billToIdx !== -1;

  return (
    <div
      dir={dir}
      className={`w-full max-w-2xl mx-auto print:max-w-none ${font}`}
      id="invoice-artifact"
    >
      {/* Print-only header */}
      <div className="hidden print:block mb-6 pb-4 border-b border-rizq-gold/30">
        <span className="font-arabic text-xl font-bold text-rizq-green">رِزق</span>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {hasBoth ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {renderSection(sections[brandingIdx], locale)}
              {renderSection(sections[billToIdx], locale)}
            </div>
            {sections
              .filter((s) => s.id !== "branding" && s.id !== "bill_to")
              .map((s) => renderSection(s, locale))}
          </>
        ) : (
          sections.map((s) => renderSection(s, locale))
        )}
      </div>
    </div>
  );
}
