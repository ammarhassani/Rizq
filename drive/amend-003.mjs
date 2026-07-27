/**
 * The verification pass on row 3: two findings withdrawn, three filed.
 *
 * Filing is cheap and a noisy basket is worthless, so what the run reported is re-checked
 * against the product before anyone is asked to act on it. Two of the seven turned out to be
 * the driver's own checks; verifying them turned up three the run had not asked about.
 */
import { setStatus, fileFinding, writeIndex } from "./basket.mjs";

const run = {
  persona: "veteran",
  flow: "invoice-and-vat",
  strategy: "differential",
  surface: "print-pdf",
  state: "degraded-profile",
  tier: "pro-active",
  entry: "direct-url",
};
const session = "S-0003";

// ── withdrawn ────────────────────────────────────────────────────────────────
setStatus(
  "RZQ-0003",
  "wont-fix",
  "Withdrawn — the driver's check, not the product. The figure that vanishes under @media " +
    "print is the header summary strip (invoices/[id]/page.tsx:164, `print:hidden`), which is " +
    "app chrome by design. Every money figure of the document itself survives printing.",
);
setStatus(
  "RZQ-0006",
  "wont-fix",
  "Withdrawn — the Latin digits on /ar/catalog were in the catalog item's own name, which the " +
    "driver had generated as 'تصميم واجهة 123531'. Same class as the accepted 'موقع ٢٥ صفحة': " +
    "the user's wording, not a figure the app formatted.",
);

// ── filed after verification ─────────────────────────────────────────────────
for (const f of [
  {
    severity: "P1",
    title: "Shared invoice puts the freelancer's login email in the link preview",
    description:
      "The anonymous invoice page sets og:title and twitter:title to the branding name, which " +
      "for a profile with no brand_name falls back through loadUserBrandDefaults " +
      "(src/lib/proposals/brand.ts:170, full_name_ar → name → email) to the account's auth " +
      "address. Pasting the invoice link into WhatsApp or Slack therefore shows the " +
      "freelancer's private login address to everyone in the conversation, before anyone " +
      "opens it. Distinct from RZQ-0004, which is the same address rendered in the page body: " +
      "this one travels without a click and cannot be taken back. brand.test.ts asserts the " +
      "email fallback is safe because 'it is not an address handed to the client' — verified " +
      "false: invoices/artifact.ts:137 uses it as brandName, and the share page renders it.",
    evidence: [
      '<meta property="og:title" content="azahrani337+rizqdrive-…@gmail.com, فاتورة رِزق"/>',
      '<meta name="twitter:title" content="azahrani337+rizqdrive-…@gmail.com, فاتورة رِزق"/>',
      "fetched anonymously from /ar/i/Eu3QyLcYdfL6hXORvh6viOR_ with no session",
      "users.brand_name and users.contact_email are both null for this account",
    ],
    route: "/ar/i/[token]",
  },
  {
    severity: "P3",
    title: "Invoice totals are shown with the halalas dropped beside the document that keeps them",
    description:
      "An invoice of 9,938.21 SAR is announced as ٩٬٩٣٨ ريال in two places while the artifact " +
      "directly below/behind it prints ٩٬٩٣٨٫٢١. (a) the invoice header summary strip renders " +
      "AnimatedNumber, which formats with maximumFractionDigits: 0 " +
      "(components/tool/AnimatedNumber.tsx:21); (b) the shared invoice's meta description does " +
      "Math.round(total_sar) (invoices share page). (b) is client-facing: the link preview " +
      "states a total 0.21 SAR below what is owed. Same view, two totals.",
    evidence: [
      "stored total_sar 9938.21",
      "header strip and og/meta description both read ٩٬٩٣٨ ريال",
      "artifact reads ٩٬٩٣٨٫٢١ ر.س",
    ],
    route: "/ar/invoices/[id]",
  },
  {
    severity: "P3",
    title: "Invoice builder prints the VAT rate in Latin digits beside the same rate in Arabic-Indic",
    description:
      "With VAT switched on, the totals panel line reads 'ضريبة القيمة المضافة (15%)' while the " +
      "toggle above it in the same view reads 'ضريبة القيمة المضافة (١٥%)' — the banned " +
      "mixed-numeral class that passes 3, 4 and 6 each closed elsewhere. The interpolation is " +
      "raw (InvoiceForm.tsx:516, `{t(\"vatLabel\")} ({vatPct}%)`), so the number never reaches a " +
      "formatter. Worth more than its severity: /ar/invoices/new is already in the numeral " +
      "sweep's route list and the sweep does not see this, because the line only renders once " +
      "VAT is on — which needs a VAT-registered profile, which a swept account never has. The " +
      "guard has a blind spot shaped like every state that takes work to reach.",
    evidence: [
      "totals panel: ضريبة القيمة المضافة (15%)",
      "toggle label in the same view: ضريبة القيمة المضافة (١٥%)",
      "sweeps.mjs APP_CHROME_ROUTES already includes /ar/invoices/new",
    ],
    route: "/ar/invoices/new",
  },
]) {
  const entry = fileFinding({ ...f, run, session });
  console.log(`${entry.ref}${entry.duplicate ? " (seen again)" : ""} ${f.severity} ${f.title}`);
}

writeIndex();
