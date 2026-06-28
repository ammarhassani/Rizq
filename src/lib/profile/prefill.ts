/**
 * Smart prefill (feature 006, v1) — heuristic mapping from a pasted profile URL
 * to the matching platform field (+ a light specialty hint). NO page fetch or
 * scraping (no-scraping rule + honesty + cost) — we only read the URL itself.
 * The caller LABELS the result as a suggestion and writes only on confirmation.
 * Pure + total.
 */

export type PrefillSuggestion = {
  platform: "bahr" | "mostaql" | "khamsat" | "linkedin" | "behance" | "website";
  /** the profile column the URL belongs in */
  field:
    | "bahr_profile_url"
    | "mostaql_profile_url"
    | "khamsat_profile_url"
    | "linkedin_url"
    | "behance_url"
    | "personal_website_url";
  /** the normalized URL */
  url: string;
  /** a soft specialty hint when the platform implies a discipline */
  specialtyHint?: string;
};

const HOSTS: { match: RegExp; platform: PrefillSuggestion["platform"]; field: PrefillSuggestion["field"]; specialtyHint?: string }[] = [
  { match: /(^|\.)bahr\.sa$/i, platform: "bahr", field: "bahr_profile_url" },
  { match: /(^|\.)mostaql\.com$/i, platform: "mostaql", field: "mostaql_profile_url" },
  { match: /(^|\.)khamsat\.com$/i, platform: "khamsat", field: "khamsat_profile_url" },
  { match: /(^|\.)linkedin\.com$/i, platform: "linkedin", field: "linkedin_url" },
  { match: /(^|\.)behance\.net$/i, platform: "behance", field: "behance_url", specialtyHint: "graphic-design" },
  { match: /(^|\.)dribbble\.com$/i, platform: "behance", field: "behance_url", specialtyHint: "ui-ux-design" },
];

export function prefillFromUrl(input: string): PrefillSuggestion | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  let host: string;
  let url: string;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    host = u.hostname.replace(/^www\./i, "");
    url = u.toString();
  } catch {
    return null;
  }
  if (!host.includes(".")) return null;

  for (const h of HOSTS) {
    if (h.match.test(host)) {
      return { platform: h.platform, field: h.field, url, specialtyHint: h.specialtyHint };
    }
  }
  // Anything else with a valid host → treat as the freelancer's personal website.
  return { platform: "website", field: "personal_website_url", url };
}
