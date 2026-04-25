// Centralized AI provider config. Default: Gemini free tier.
// Users can BYO key via the `x-byo-google-key` request header.

import { google, createGoogleGenerativeAI } from "@ai-sdk/google";

export const DEFAULT_MODEL_ID = "gemini-2.5-flash";
export const JUDGE_MODEL_ID = "gemini-2.5-pro"; // stronger, frozen for eval
export const EMBEDDING_MODEL_ID = "text-embedding-004";

/** Pick the right provider based on whether the user supplied their own key. */
export function getProvider(byoKey?: string | null) {
  if (byoKey && byoKey.length > 10) {
    return createGoogleGenerativeAI({ apiKey: byoKey });
  }
  // Falls back to GOOGLE_GENERATIVE_AI_API_KEY env var
  return google;
}

export function isAiAvailable(byoKey?: string | null): boolean {
  return Boolean(byoKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
