// Direct REST call to Gemini's embedContent endpoint.
// We bypass the AI SDK `embed()` helper because ai@6.0.168 + @ai-sdk/google
// has a v2-compat-mode bug where `warnings:undefined` crashes the warning
// logger before any value is returned.

import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL_ID } from "./provider";

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

async function embedRaw(text: string, taskType: TaskType, byoKey?: string | null): Promise<number[]> {
  const apiKey = byoKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("No Gemini API key available for embedding");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL_ID}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL_ID}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    }),
  });
  if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { embedding: { values: number[] } };
  return data.embedding.values;
}

export const embedQuery = (text: string, byoKey?: string | null) =>
  embedRaw(text, "RETRIEVAL_QUERY", byoKey);

export const embedDocument = (text: string, byoKey?: string | null) =>
  embedRaw(text, "RETRIEVAL_DOCUMENT", byoKey);
