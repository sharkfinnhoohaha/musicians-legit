// Threshold applier — regex-edits ONE scalar in lib/autoresearch/config.ts.
//
// The config file is structured per the contract documented at the top of
// lib/autoresearch/config.ts:
//   • flat object literals of `KEY: number` pairs
//   • each pair on its own line, exactly `  KEY: <number>,`
//   • no comments inside the literal
// We rely on that contract here. A failed match aborts with a clear error
// (the orchestrator turns this into revertedReason="applier-failed").

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const KNOWN_THRESHOLD_KEYS = [
  "SEMANTIC_K",
  "KEYWORD_K",
  "RRF_K",
  "FINAL_TOP_N",
  "ARCHETYPE_BIAS",
] as const;

export type ThresholdKey = (typeof KNOWN_THRESHOLD_KEYS)[number];

const VALIDATORS: Record<ThresholdKey, (v: number) => string | null> = {
  SEMANTIC_K: (v) => (Number.isInteger(v) && v >= 1 && v <= 200 ? null : "1≤int≤200"),
  KEYWORD_K: (v) => (Number.isInteger(v) && v >= 1 && v <= 200 ? null : "1≤int≤200"),
  RRF_K: (v) => (Number.isInteger(v) && v >= 1 && v <= 500 ? null : "1≤int≤500"),
  FINAL_TOP_N: (v) => (Number.isInteger(v) && v >= 1 && v <= 50 ? null : "1≤int≤50"),
  ARCHETYPE_BIAS: (v) => (v >= 0.5 && v <= 5 ? null : "0.5≤x≤5"),
};

export type ThresholdResult = { mutationSha: string; oldValue: number; newValue: number };

export async function applyThreshold(args: {
  key: ThresholdKey;
  newValue: number;
}): Promise<ThresholdResult> {
  const { key, newValue } = args;

  const reason = VALIDATORS[key](newValue);
  if (reason !== null) {
    throw new Error(`threshold ${key}=${newValue} out of bounds (${reason})`);
  }

  const file = path.join(process.cwd(), "lib/autoresearch/config.ts");
  const src = await fs.readFile(file, "utf8");

  // Match exactly: leading whitespace, KEY:, optional spaces, number literal, comma.
  // Number literal can be int or decimal, no expressions, no leading +.
  const re = new RegExp(`^(\\s*${key}:\\s*)(-?\\d+(?:\\.\\d+)?)(,)$`, "m");
  const match = src.match(re);
  if (!match) throw new Error(`could not locate ${key} in ${file}`);

  const oldValue = Number(match[2]);
  if (oldValue === newValue) {
    throw new Error(`threshold ${key} already equals ${newValue} — no-op proposal`);
  }

  const replaced = src.replace(re, `$1${newValue}$3`);
  await atomicWrite(file, replaced);

  // Spot-check: re-read and confirm the regex now matches the new value.
  const verify = await fs.readFile(file, "utf8");
  const m2 = verify.match(re);
  if (!m2 || Number(m2[2]) !== newValue) {
    throw new Error(`post-write verify failed for ${key}`);
  }

  const sha = createHash("sha256")
    .update(`${key}=${newValue}`)
    .digest("hex")
    .slice(0, 12);
  return { mutationSha: sha, oldValue, newValue };
}

async function atomicWrite(file: string, contents: string): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, contents, "utf8");
  await fs.rename(tmp, file);
}
