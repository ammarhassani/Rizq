import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";

/** Server-only DeepSeek provider (Vercel AI SDK). Never import in client code. */
export const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

/** Default model for reasoned priors + extraction (DeepSeek V3). */
export const REASONING_MODEL = "deepseek-chat";
