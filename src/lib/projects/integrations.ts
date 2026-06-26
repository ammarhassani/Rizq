/**
 * Project hub (spec 002) — project_integrations input validation (pure).
 *
 * Validates a would-be integration before insert: provider must be a known
 * registry value and external_url must be a well-formed http(s) URL. No
 * credentials/secrets are ever accepted here (OAuth is deferred). Unit-tested.
 */

import {
  PROJECT_INTEGRATION_PROVIDERS,
  type ProjectIntegrationProvider,
} from "./types";

export function isValidProvider(value: string): value is ProjectIntegrationProvider {
  return (PROJECT_INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function isValidExternalUrl(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type IntegrationInput = {
  provider: string;
  external_url: string;
  display_label: string;
};

export type IntegrationValidation =
  | { ok: true; value: { provider: ProjectIntegrationProvider; external_url: string; display_label: string } }
  | { ok: false; reason: "provider" | "url" | "label" };

export function validateIntegrationInput(input: IntegrationInput): IntegrationValidation {
  if (!isValidProvider(input.provider)) return { ok: false, reason: "provider" };
  if (!isValidExternalUrl(input.external_url)) return { ok: false, reason: "url" };
  const label = (input.display_label ?? "").trim();
  if (label.length === 0 || label.length > 120) return { ok: false, reason: "label" };
  return {
    ok: true,
    value: { provider: input.provider, external_url: input.external_url, display_label: label },
  };
}
