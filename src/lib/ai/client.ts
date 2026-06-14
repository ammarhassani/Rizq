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

/** Default model for reasoned priors + extraction (DeepSeek V3). */
export const REASONING_MODEL = "deepseek-chat";

/**
 * Whether the DeepSeek API key is present in this runtime. AI-backed features
 * check this to degrade gracefully (e.g. a computed fallback) instead of erroring
 * when the key isn't configured in the serving environment.
 */
export function isAIConfigured(): boolean {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim().length > 0;
}
