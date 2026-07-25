import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";

/**
 * Server-only DeepSeek provider (Vercel AI SDK). Never import in client code.
 * The key is trimmed: a trailing space/newline pasted into the Vercel env value
 * is a common, silent cause of 401s (the header becomes "Bearer <key>\n").
 */
export const deepseek = createDeepSeek({
  apiKey: (process.env.DEEPSEEK_API_KEY ?? "").trim(),
});

/**
 * Default model for reasoned priors + extraction.
 *
 * MUST be a currently-served model id. DeepSeek retired `deepseek-chat` (V3) and
 * the API now hard-rejects it — "The supported API model names are
 * deepseek-v4-pro or deepseek-v4-flash" — which took down EVERY AI surface at
 * once (scope extraction, proposals, insights, tone, forecasts) with a generic
 * "we couldn't analyze that" rather than anything pointing at the model id.
 *
 * `-flash` over `-pro`, measured on a REALISTIC extraction (long brief + the full
 * scope schema), not a toy prompt: flash ~7s, pro ~24s. Pro blows the 20s
 * extraction abort every time — and the 15s positioning and 12s trend aborts too
 * — so it would reintroduce the exact "we couldn't analyze that" failure this
 * constant caused when it went stale. Quality is not the trade it looks like:
 * prices come from the deterministic resolver, and the model only extracts scope
 * and narrates figures it is given.
 *
 * If AI features start failing wholesale, check this against the live list first:
 *   curl https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
 */
export const REASONING_MODEL = "deepseek-v4-flash";

/**
 * Whether the DeepSeek API key is present in this runtime. AI-backed features
 * check this to degrade gracefully (e.g. a computed fallback) instead of erroring
 * when the key isn't configured in the serving environment.
 */
export function isAIConfigured(): boolean {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim().length > 0;
}
