/**
 * Proposal → Word (.docx) export.
 *
 * The Studio is the workstation; the artifact that LEAVES it must be an editable
 * Word document a client can open, edit, and sign — not a print of a web page.
 * This builds a real .docx from the stored `artifact_json`, server-side, with
 * the `docx` library (full control over RTL Arabic shaping, headings, tables,
 * and brand colors).
 *
 * Honesty: every number / date / name / price / prose body comes from
 * `artifact_json` (already computed + reviewed). Nothing is fabricated here.
 * Labels + templated defaults reuse the SAME `T` table the on-screen renderer
 * uses, so the Word file matches the preview. The internal "AI-drafted, review
 * before sending" badge is intentionally omitted — the .docx is the final,
 * owner-reviewed deliverable.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  type ISpacingProperties,
} from "docx";
import type { ArtifactData } from "./artifact";
import { ownTagline } from "./artifact";
import { PROPOSAL_STRINGS as T } from "./proposalStrings";
import { fmtMoney } from "@/lib/format/number";

type Locale = "ar" | "en";

// Brand palette (docx wants hex WITHOUT the leading #).
const GREEN = "1A5F3F";
const GOLD = "C8A951";
const INK = "1A1A1A";
const INK_SOFT = "5A5A5A";
const FONT = "Arial"; // ships on Word everywhere and shapes Arabic correctly

// ── value coercion (artifact content is Record<string, unknown>) ──────────────
function s(v: unknown, fb = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fb;
}
function n(v: unknown, fb = 0): number {
  return typeof v === "number" && isFinite(v) ? v : fb;
}
function arr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export async function buildProposalDocxBuffer(
  data: ArtifactData,
  locale: Locale
): Promise<Buffer> {
  const isAr = locale === "ar";
  const t = T[locale];

  const byId = new Map<string, Record<string, unknown>>(
    data.sections.map((sec) => [sec.id as string, sec.content])
  );
  const get = (id: string): Record<string, unknown> => byId.get(id) ?? {};

  function fmtPrice(x: number): string {
    return fmtMoney(x, isAr ? "ar" : "en");
  }
  function fmtDate(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
      return new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  // ── paragraph builders (close over locale for RTL) ──────────────────────────
  const align = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;

  function run(
    text: string,
    opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}
  ): TextRun {
    return new TextRun({
      text,
      bold: opts.bold ?? false,
      italics: opts.italics ?? false,
      size: opts.size ?? 22, // half-points → 11pt
      color: opts.color ?? INK,
      font: FONT,
      rightToLeft: isAr,
    });
  }

  function para(
    text: string,
    opts: {
      bold?: boolean;
      italics?: boolean;
      size?: number;
      color?: string;
      spacing?: ISpacingProperties;
      bullet?: boolean;
    } = {}
  ): Paragraph {
    return new Paragraph({
      bidirectional: isAr,
      alignment: align,
      spacing: opts.spacing ?? { after: 120 },
      ...(opts.bullet ? { bullet: { level: 0 } } : {}),
      children: [run(text, opts)],
    });
  }

  /** A labelled line: "<label>: <value>". */
  function labelLine(label: string, value: string): Paragraph {
    return new Paragraph({
      bidirectional: isAr,
      alignment: align,
      spacing: { after: 80 },
      children: [
        run(`${label}: `, { bold: true, color: INK_SOFT, size: 20 }),
        run(value, { size: 20 }),
      ],
    });
  }

  function sectionHeading(text: string): Paragraph {
    return new Paragraph({
      bidirectional: isAr,
      alignment: align,
      spacing: { before: 360, after: 140 },
      border: {
        bottom: { color: GOLD, size: 6, style: BorderStyle.SINGLE, space: 4 },
      },
      children: [run(text, { bold: true, size: 26, color: GREEN })],
    });
  }

  function spacer(after = 200): Paragraph {
    return new Paragraph({ spacing: { after }, children: [] });
  }

  const children: Paragraph[] = [];

  // ── Cover ───────────────────────────────────────────────────────────────────
  {
    const c = get("cover");
    const brandName = s(c["brandName"]);
    const tagline = ownTagline(s(c["tagline"])) ?? "";
    const projectTitle = s(c["projectTitle"], t.coverDocLabel);
    const clientName = s(c["clientName"], t.noClient);
    const issueDate = fmtDate(s(c["issueDate"]) || null);
    const validityDays = n(c["validityDays"], 30);

    if (brandName) {
      children.push(
        new Paragraph({
          bidirectional: isAr,
          alignment: align,
          spacing: { after: tagline ? 40 : 200 },
          children: [run(brandName, { bold: true, size: 40, color: GREEN })],
        })
      );
    }
    if (tagline) {
      children.push(para(tagline, { italics: true, size: 20, color: INK_SOFT, spacing: { after: 240 } }));
    }
    children.push(
      new Paragraph({
        bidirectional: isAr,
        alignment: align,
        spacing: { before: 120, after: 200 },
        children: [run(projectTitle, { bold: true, size: 48, color: INK })],
      })
    );
    children.push(labelLine(t.preparedFor, clientName));
    if (issueDate) children.push(labelLine(t.issuedOn, issueDate));
    children.push(labelLine(t.validUntil, t.validityDays(validityDays)));
  }

  // ── Cover letter ─────────────────────────────────────────────────────────────
  {
    const c = get("cover_letter");
    const clientName = s(get("cover")["clientName"], t.noClient);
    const body = s(c["body"]) || t.coverLetterDefault(clientName);
    children.push(sectionHeading(t.sections.cover_letter));
    for (const line of body.split(/\n+/).filter(Boolean)) {
      children.push(para(line, { spacing: { after: 140 } }));
    }
  }

  // ── Understanding ──────────────────────────────────────────────────────────────
  {
    const c = get("understanding");
    const body = s(c["body"]) || t.understandingDefault;
    children.push(sectionHeading(t.sections.understanding));
    for (const line of body.split(/\n+/).filter(Boolean)) {
      children.push(para(line, { spacing: { after: 140 } }));
    }
  }

  // ── Approach (phases) ────────────────────────────────────────────────────────
  {
    const c = get("approach");
    const phases = (arr<{ title?: unknown; body?: unknown }>(c["phases"]).length
      ? arr<{ title?: unknown; body?: unknown }>(c["phases"])
      : t.approachDefault) as { title: unknown; body: unknown }[];
    children.push(sectionHeading(t.sections.approach));
    phases.forEach((ph, i) => {
      const title = s(ph.title, `${i + 1}`);
      const body = s(ph.body);
      children.push(
        new Paragraph({
          bidirectional: isAr,
          alignment: align,
          spacing: { before: 80, after: 40 },
          children: [run(`${i + 1}. ${title}`, { bold: true, size: 22, color: GREEN })],
        })
      );
      if (body) children.push(para(body, { spacing: { after: 120 } }));
    });
  }

  // ── Scope of work ──────────────────────────────────────────────────────────────
  {
    const c = get("scope_of_work");
    const description = s(c["description"]);
    const deliverables = arr<string>(c["deliverables"]).filter((d) => typeof d === "string" && d);
    const descriptions = arr<string>(c["deliverable_descriptions"]);
    children.push(sectionHeading(t.sections.scope_of_work));
    if (description && description !== "—") {
      children.push(para(description, { spacing: { after: 140 } }));
    }
    children.push(para(t.scopeDeliverables, { bold: true, size: 22, spacing: { after: 80 } }));
    if (deliverables.length === 0) {
      children.push(para(t.noDeliverables, { color: INK_SOFT }));
    } else {
      deliverables.forEach((d, i) => {
        const desc = s(descriptions[i]);
        children.push(para(desc ? `${d} — ${desc}` : d, { bullet: true, spacing: { after: 60 } }));
      });
    }
  }

  // ── Assumptions & exclusions ───────────────────────────────────────────────────
  {
    const c = get("assumptions");
    const assumptions = arr<string>(c["assumptions"]).filter(Boolean);
    const exclusions = arr<string>(c["exclusions"]).filter(Boolean);
    const aList = assumptions.length ? assumptions : t.assumptionsDefault;
    const eList = exclusions.length ? exclusions : t.exclusionsDefault;
    children.push(sectionHeading(t.sections.assumptions));
    children.push(para(t.assumptionsTitle, { bold: true, size: 22, spacing: { after: 60 } }));
    aList.forEach((a) => children.push(para(s(a), { bullet: true, spacing: { after: 50 } })));
    children.push(para(t.exclusionsTitle, { bold: true, size: 22, spacing: { before: 120, after: 60 } }));
    eList.forEach((e) => children.push(para(s(e), { bullet: true, spacing: { after: 50 } })));
  }

  // ── Timeline ───────────────────────────────────────────────────────────────────
  {
    const c = get("timeline");
    const start = fmtDate(s(c["startDate"]) || null);
    const delivery = fmtDate(s(c["deliveryDate"]) || null);
    const statedDuration = s(c["statedDuration"]);
    children.push(sectionHeading(t.sections.timeline));
    children.push(labelLine(t.startDate, start || t.noDates));
    children.push(labelLine(t.deliveryDate, delivery || t.noDates));
    // The client's own words about timing — the preview and the deliverable must match.
    if (statedDuration) children.push(labelLine(t.statedDurationLabel, statedDuration));
  }

  // ── Pricing (Investment) ───────────────────────────────────────────────────────
  {
    const c = get("pricing");
    const anchor = n(c["anchor"]);
    const min = n(c["min"]);
    const max = n(c["max"]);
    const citation = s(c["citation"]);
    const included = arr<string>(c["included"]).filter(Boolean);
    const deliverables = arr<string>(get("scope_of_work")["deliverables"]).filter(
      (d) => typeof d === "string" && d
    );
    const includedList = included.length ? included : deliverables;
    children.push(sectionHeading(t.sections.pricing));
    children.push(
      new Paragraph({
        bidirectional: isAr,
        alignment: align,
        spacing: { after: 60 },
        children: [
          run(t.anchor + ": ", { bold: true, color: INK_SOFT, size: 22 }),
          run(`${fmtPrice(anchor)} ${t.currency}`, { bold: true, size: 30, color: GREEN }),
        ],
      })
    );
    if (min > 0 && max > 0) {
      children.push(
        labelLine(t.priceRange, `${fmtPrice(min)} – ${fmtPrice(max)} ${t.currency}`)
      );
    }
    if (includedList.length) {
      children.push(para(t.included, { bold: true, size: 22, spacing: { before: 100, after: 60 } }));
      includedList.forEach((it) => children.push(para(s(it), { bullet: true, spacing: { after: 50 } })));
    }
    if (citation) {
      children.push(para(`${t.citation}: ${citation}`, { italics: true, size: 18, color: INK_SOFT, spacing: { before: 100, after: 60 } }));
    }
  }

  // ── Payment milestones ───────────────────────────────────────────────────────
  {
    const c = get("milestones");
    const milestones = arr<{ pct?: unknown; trigger?: unknown }>(c["milestones"]);
    if (milestones.length) {
      children.push(sectionHeading(t.sections.milestones));
      milestones.forEach((m) => {
        const pct = n(m.pct);
        const trigger = s(m.trigger);
        const triggerLabel = trigger === "deposit" ? t.triggerDeposit : t.triggerDelivery;
        children.push(
          new Paragraph({
            bidirectional: isAr,
            alignment: align,
            spacing: { after: 70 },
            bullet: { level: 0 },
            children: [
              run(`${pct}% ${t.ofTotal} `, { bold: true, size: 22 }),
              run(`— ${triggerLabel}`, { size: 20, color: INK_SOFT }),
            ],
          })
        );
      });
    }
  }

  // ── About the freelancer ───────────────────────────────────────────────────────
  {
    const c = get("about");
    const bio = s(isAr ? c["bioAr"] : c["bioEn"]) || s(isAr ? c["bioEn"] : c["bioAr"]);
    const years = n(c["yearsExperience"]);
    const projects = n(c["totalProjectsCompleted"]);
    const notable = arr<string>(c["notableClients"]).filter(Boolean);
    const portfolio = arr<{ title?: unknown; url?: unknown; description?: unknown }>(c["portfolioSamples"]);
    const testimonials = arr<{ clientName?: unknown; clientTitle?: unknown; quoteAr?: unknown; quoteEn?: unknown }>(c["testimonials"]);

    const hasAny = bio || years > 0 || projects > 0 || notable.length || portfolio.length || testimonials.length;
    if (hasAny) {
      children.push(sectionHeading(t.sections.about));
      if (bio) children.push(para(bio, { spacing: { after: 120 } }));
      if (years > 0) children.push(labelLine(t.yearsExp, String(years)));
      if (projects > 0) children.push(labelLine(t.projectsDone, String(projects)));
      if (notable.length) children.push(labelLine(t.notableClientsLabel, notable.join("، ")));

      if (portfolio.length) {
        children.push(para(t.portfolioLabel, { bold: true, size: 22, spacing: { before: 120, after: 60 } }));
        portfolio.forEach((pf) => {
          const title = s(pf.title);
          const url = s(pf.url);
          const desc = s(pf.description);
          if (!title) return;
          const line = [title, desc].filter(Boolean).join(" — ");
          children.push(para(url ? `${line} (${url})` : line, { bullet: true, spacing: { after: 50 } }));
        });
      }

      if (testimonials.length) {
        children.push(para(t.testimonialsLabel, { bold: true, size: 22, spacing: { before: 120, after: 60 } }));
        testimonials.forEach((tm) => {
          const quote = s(isAr ? tm.quoteAr : tm.quoteEn) || s(isAr ? tm.quoteEn : tm.quoteAr);
          if (!quote) return;
          const who = [s(tm.clientName), s(tm.clientTitle)].filter(Boolean).join(", ");
          children.push(para(`“${quote}”`, { italics: true, spacing: { after: who ? 30 : 90 } }));
          if (who) children.push(para(`— ${who}`, { size: 18, color: INK_SOFT, spacing: { after: 90 } }));
        });
      }
    }
  }

  // ── Terms & conditions ─────────────────────────────────────────────────────────
  {
    const c = get("terms");
    const deposit = n(c["depositPct"], 50);
    const remainder = 100 - deposit;
    const revisions = c["revisions"];
    const ipTerms = s(c["ipTerms"], "full_transfer");
    const validityDays = n(c["validityDays"], 30);
    const ipClause = ipTerms === "license" ? t.ipLicense : ipTerms === "per_project" ? t.ipPerProject : t.ipFull;

    children.push(sectionHeading(t.sections.terms));
    const clause = (label: string, body: string) => {
      children.push(para(label, { bold: true, size: 22, spacing: { before: 100, after: 40 } }));
      children.push(para(body, { spacing: { after: 60 } }));
    };
    clause(t.termsPayment, t.termsPaymentClause(deposit, remainder));
    clause(
      t.termsRevisions,
      typeof revisions === "number" ? t.termsRevisionsClause(revisions) : t.termsRevisionsClauseNone
    );
    clause(t.termsIp, ipClause);
    clause(t.termsConfidentiality, t.termsConfidentialityClause);
    clause(t.termsValidity, t.termsValidityClause(validityDays));
    clause(t.termsCancellation, t.termsCancellationClause);
  }

  // ── Next steps + acceptance / signature block ──────────────────────────────────
  {
    const c = get("next_steps");
    const contact = (c["contact"] as { email?: string | null; phone?: string | null; whatsapp?: string | null } | null) ?? null;
    children.push(sectionHeading(t.sections.next_steps));
    children.push(para(t.nextStepsCta, { spacing: { after: 160 } }));

    if (contact && (contact.email || contact.phone || contact.whatsapp)) {
      const parts = [contact.email, contact.phone, contact.whatsapp].filter(Boolean) as string[];
      children.push(labelLine(t.contactLabel, parts.join(" · ")));
    }

    children.push(para(t.acceptanceBlock, { bold: true, size: 22, spacing: { before: 200, after: 120 } }));
    children.push(labelLine(t.clientName, "_______________________________"));
    children.push(labelLine(t.signature, "_______________________________"));
    children.push(labelLine(t.date, "_______________________________"));
  }

  // ── Verification footer ────────────────────────────────────────────────────────
  {
    const c = get("verification");
    const label = t.generatedBy; // follows the document language, not artifact_json
    const proposalId = s(c["proposalId"]);
    children.push(spacer(240));
    children.push(
      new Paragraph({
        bidirectional: isAr,
        alignment: AlignmentType.CENTER,
        border: { top: { color: GOLD, size: 4, style: BorderStyle.SINGLE, space: 6 } },
        spacing: { before: 120, after: 20 },
        children: [run(label, { size: 16, color: INK_SOFT })],
      })
    );
    if (proposalId) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [run(`${t.proposalId}: ${proposalId}`, { size: 14, color: INK_SOFT })],
        })
      );
    }
  }

  const doc = new Document({
    creator: "Rizq",
    title: t.coverDocLabel,
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // A4 in twips (1 inch = 1440); A4 = 8.27in × 11.69in.
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
