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
 * `-pro` over `-flash`: this constant backs pricing priors and scope extraction,
 * where correctness is the product's moat (Principle I); measured latency is
 * ~1.8s vs ~1.2s, well inside the 20s extraction abort, so quality wins.
 *
 * If AI features start failing wholesale, check this against the live list first:
 *   curl https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
 */
export const REASONING_MODEL = "deepseek-v4-pro";

/**
 * Whether the DeepSeek API key is present in this runtime. AI-backed features
 * check this to degrade gracefully (e.g. a computed fallback) instead of erroring
 * when the key isn't configured in the serving environment.
 */
export function isAIConfigured(): boolean {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim().length > 0;
}
