// Loads externalized system prompts from disk so the auto-research loop can mutate them safely.
// Cached by name with a content-hash for change detection in logs.
//
// SAFETY: Only the auto-research applier should ever WRITE these files. Production code only reads.

import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export type PromptName = "classify" | "generate" | "rerank";

type CacheEntry = { content: string; sha: string };
const cache = new Map<PromptName, CacheEntry>();

function promptPath(name: PromptName): string {
  return path.join(process.cwd(), "lib", "ai", "prompts", `${name}.system.md`);
}

function readFresh(name: PromptName): CacheEntry {
  const content = readFileSync(promptPath(name), "utf8").trim();
  const sha = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return { content, sha };
}

/** Read a prompt by name. Memoized — call `clearPromptCache()` after mutation. */
export function loadPrompt(name: PromptName): string {
  const hit = cache.get(name);
  if (hit) return hit.content;
  const fresh = readFresh(name);
  cache.set(name, fresh);
  return fresh.content;
}

/** SHA12 of the loaded prompt — used in experiment logs so we can attribute eval scores to a specific prompt revision. */
export function loadPromptSha(name: PromptName): string {
  const hit = cache.get(name);
  if (hit) return hit.sha;
  const fresh = readFresh(name);
  cache.set(name, fresh);
  return fresh.sha;
}

/** Force re-read on next loadPrompt(). Called by the prompt applier after writing. */
export function clearPromptCache(name?: PromptName): void {
  if (name) cache.delete(name);
  else cache.clear();
}
