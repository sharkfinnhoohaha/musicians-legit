// Weights applier — replaces ALL keys of one weight stanza in lib/autoresearch/config.ts
// in a single atomic edit. Weights are checked to sum to 1.0 ± 0.001 before
// writing (per the plan).
//
// The applier knows the two stanzas it can target:
//   key="retrieval"  → RETRIEVAL_WEIGHTS (keys: semantic, keyword)
//   key="confidence" → CONFIDENCE_WEIGHTS (keys: retrieval_quality,
//                          classification_confidence, field_completeness,
//                          clause_review_status, jurisdiction_match)
//
// The applier refuses unknown keys, missing keys, extra keys, or any
// non-finite numeric value. This is the only way we ensure the proposer
// can't smuggle a new dimension in via a weights mutation.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const STANZA_KEYS = {
  retrieval: ["semantic", "keyword"] as const,
  confidence: [
    "retrieval_quality",
    "classification_confidence",
    "field_completeness",
    "clause_review_status",
    "jurisdiction_match",
  ] as const,
} as const;

const STANZA_VAR = {
  retrieval: "RETRIEVAL_WEIGHTS",
  confidence: "CONFIDENCE_WEIGHTS",
} as const;

export type WeightsKey = keyof typeof STANZA_KEYS;

export type WeightsResult = {
  mutationSha: string;
  oldWeights: Record<string, number>;
  newWeights: Record<string, number>;
};

export async function applyWeights(args: {
  key: WeightsKey;
  newWeights: Record<string, number>;
}): Promise<WeightsResult> {
  const { key, newWeights } = args;

  const expected = STANZA_KEYS[key];
  const got = Object.keys(newWeights).sort();
  const want = [...expected].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
    throw new Error(
      `weights ${key} must have exactly keys ${want.join(",")} — got ${got.join(",")}`,
    );
  }
  for (const v of Object.values(newWeights)) {
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`weights ${key} must be non-negative finite numbers`);
    }
  }
  const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error(`weights ${key} sum ${sum.toFixed(4)} not in 1.0 ± 0.001`);
  }

  const file = path.join(process.cwd(), "lib/autoresearch/config.ts");
  const src = await fs.readFile(file, "utf8");

  // Find the stanza body. Match `export const VAR = {  ...  };`.
  const varName = STANZA_VAR[key];
  const stanzaRe = new RegExp(
    `(export const ${varName} = \\{)([\\s\\S]*?)(\\};)`,
    "m",
  );
  const match = src.match(stanzaRe);
  if (!match) throw new Error(`could not locate ${varName} stanza`);

  // Parse old values from the existing stanza body.
  const oldWeights: Record<string, number> = {};
  for (const k of expected) {
    const lineRe = new RegExp(`^\\s*${k}:\\s*(-?\\d+(?:\\.\\d+)?),\\s*$`, "m");
    const m = match[2].match(lineRe);
    if (!m) throw new Error(`old ${varName}.${k} not found`);
    oldWeights[k] = Number(m[1]);
  }

  // Build the replacement body: one `KEY: value,` per line, alphabetical
  // order matching expected[]. Trailing newline before the closing brace
  // matches the existing file convention.
  const newBody =
    "\n" + expected.map((k) => `  ${k}: ${formatNumber(newWeights[k])},`).join("\n") + "\n";
  const replaced = src.replace(stanzaRe, `$1${newBody}$3`);

  await atomicWrite(file, replaced);

  // Verify by re-matching.
  const verify = await fs.readFile(file, "utf8");
  const m2 = verify.match(stanzaRe);
  if (!m2) throw new Error("post-write verify failed");
  for (const k of expected) {
    const lineRe = new RegExp(`^\\s*${k}:\\s*(-?\\d+(?:\\.\\d+)?),\\s*$`, "m");
    const m = m2[2].match(lineRe);
    if (!m || Math.abs(Number(m[1]) - newWeights[k]) > 1e-9) {
      throw new Error(`post-write verify failed for ${varName}.${k}`);
    }
  }

  const sha = createHash("sha256")
    .update(JSON.stringify(newWeights, expected as unknown as string[]))
    .digest("hex")
    .slice(0, 12);
  return { mutationSha: sha, oldWeights, newWeights };
}

function formatNumber(n: number): string {
  // Stable serialization: integers render as integers, decimals truncated to 6 places.
  if (Number.isInteger(n)) return n.toString();
  return Number(n.toFixed(6)).toString();
}

async function atomicWrite(file: string, contents: string): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, file);
}
