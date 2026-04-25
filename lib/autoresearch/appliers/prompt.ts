// Prompt applier — atomically replaces lib/ai/prompts/<name>.system.md with
// the proposer's new full prompt. Sanity check: new length must be 0.5×–3× of
// the current length so a degenerate "" or 100KB prompt can't slip through.
//
// After writing, we invalidate the loadPrompt cache so the next eval call
// reads the new content from disk.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { clearPromptCache, type PromptName } from "@/lib/ai/prompts";

export type PromptResult = {
  mutationSha: string;
  oldLen: number;
  newLen: number;
};

export async function applyPrompt(args: {
  name: PromptName;
  newFullPrompt: string;
}): Promise<PromptResult> {
  const { name, newFullPrompt } = args;

  const newPrompt = newFullPrompt.trim();
  if (newPrompt.length < 200) {
    throw new Error(`prompt ${name} too short (${newPrompt.length} chars)`);
  }

  const file = path.join(process.cwd(), "lib/ai/prompts", `${name}.system.md`);
  const old = await fs.readFile(file, "utf8");
  const oldLen = old.trim().length;

  if (newPrompt === old.trim()) {
    throw new Error(`prompt ${name} unchanged — no-op proposal`);
  }
  if (newPrompt.length < oldLen * 0.5 || newPrompt.length > oldLen * 3) {
    throw new Error(
      `prompt ${name} length ${newPrompt.length} outside 0.5×–3× of current ${oldLen}`,
    );
  }

  await atomicWrite(file, newPrompt + "\n");

  // Invalidate the in-process cache so the next loadPrompt() reads the new file.
  clearPromptCache(name);

  const sha = createHash("sha256").update(newPrompt).digest("hex").slice(0, 12);
  return { mutationSha: sha, oldLen, newLen: newPrompt.length };
}

async function atomicWrite(file: string, contents: string): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, file);
}
