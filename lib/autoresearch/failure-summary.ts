// ════════════════════════════════════════════════════════════════════════
//   ANTI-GOODHART FIREWALL.
//
//   This module is the *only* code path that feeds the proposer. It reads
//   eval/.last-run.json and projects it through an explicit field whitelist
//   so rubric criteria, must_include_terms, expected_confidence_range, etc.
//   never reach the LLM. If the proposer ever sees those, it can game the
//   eval — and the whole loop becomes a metric optimizer instead of a
//   product improver.
//
//   New fields surfaced by the runner MUST be added to ALLOWED_RESULT_KEYS
//   below explicitly. Default-deny.
// ════════════════════════════════════════════════════════════════════════

import { promises as fs } from "node:fs";
import path from "node:path";

/** Fields from each per-scenario `result` row that the proposer is allowed to see. */
const ALLOWED_RESULT_KEYS = [
  "id",
  "archetype",
  "composite",
  "retrieval_recall",
  "judge_rubric_pass_rate",
  "factual_consistency",
  "latency_penalty",
  "latencyMs",
  "avgSimilarity",
  // Slugs are aggregate signal — useful for "we kept missing X". They reveal
  // *what* clauses exist (which is fine, that's the whole catalog), not what
  // the rubric expects. We intentionally do NOT expose expectedSlugs.
  "retrievedSlugs",
  // Free-text judge notes are useful diagnostic signal. They sometimes
  // contain rubric-adjacent language ("model failed to include disclaimer"),
  // but that's the actual failure mode and the proposer needs to see it
  // to fix it. The rubric criteria themselves are still hidden.
  "judgeNotes",
  // Per-dimension judge scores so the proposer can see "completeness is the
  // bottleneck" vs "neutrality is the bottleneck". Numerical, not the rubric.
  "judgeScores",
] as const;

/** Fields from the run-level summary the proposer is allowed to see. */
const ALLOWED_SUMMARY_KEYS = [
  "n",
  "composite_mean",
  "retrieval_recall_mean",
  "judge_rubric_mean",
  "factual_consistency_mean",
  "latency_p50_ms",
  "judge_dimension_means",
  "adversarial_neutrality_mean",
  "vague_followup_compliance",
  "weights",
] as const;

type LastRun = Record<string, unknown> & {
  results: Record<string, unknown>[];
};

export type ProposerInput = {
  summary: Record<string, unknown>;
  worst5: Record<string, unknown>[];
  recent_experiments: ExperimentRow[];
  hints_markdown: string;
  hints_sha: string;
  baseline_lock: { active: boolean; locked_targets: string[] };
};

export type ExperimentRow = {
  id: string;
  changeDescription: string;
  target: string;
  targetRefSlug?: string | null;
  beforeScore?: string | number | null;
  afterScore?: string | number | null;
  kept: boolean;
  revertedReason?: string | null;
  createdAt?: string | Date;
};

function pick<T extends string>(
  src: Record<string, unknown>,
  keys: readonly T[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(src, k)) out[k] = src[k];
  }
  return out;
}

export async function loadLastRun(): Promise<LastRun> {
  const p = path.join(process.cwd(), "eval/.last-run.json");
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw) as LastRun;
}

/**
 * Optional manually-curated hints file. The UX advisory track writes
 * graduated hypotheses here for the proposer to consider. Empty file (or
 * missing) is fine.
 */
export async function loadHints(): Promise<{ markdown: string; sha: string }> {
  const p = path.join(process.cwd(), "lib/autoresearch/hints.md");
  try {
    const md = (await fs.readFile(p, "utf8")).trim();
    const { createHash } = await import("node:crypto");
    return { markdown: md, sha: createHash("sha256").update(md).digest("hex").slice(0, 12) };
  } catch {
    return { markdown: "", sha: "none" };
  }
}

/**
 * Builds the redacted, proposer-facing view of the last eval run.
 *
 * Order of operations:
 *   1. Whitelist summary fields.
 *   2. Sort per-scenario results by composite ASC, take 5.
 *   3. Whitelist each result's fields.
 *   4. Pass through the recent experiments tail (already proposer-safe —
 *      changeDescription / target / kept / reason).
 *   5. Append optional hints.
 */
export function buildProposerInput(args: {
  lastRun: LastRun;
  recentExperiments: ExperimentRow[];
  hints: { markdown: string; sha: string };
  baselineLock?: { active: boolean; locked_targets: string[] };
}): ProposerInput {
  const { lastRun, recentExperiments, hints, baselineLock } = args;

  const summary = pick(lastRun, ALLOWED_SUMMARY_KEYS);

  const sortedResults = [...lastRun.results].sort(
    (a, b) => Number(a.composite ?? 1) - Number(b.composite ?? 1),
  );
  const worst5 = sortedResults.slice(0, 5).map((r) => pick(r, ALLOWED_RESULT_KEYS));

  return {
    summary,
    worst5,
    recent_experiments: recentExperiments.slice(0, 10),
    hints_markdown: hints.markdown,
    hints_sha: hints.sha,
    baseline_lock: baselineLock ?? { active: false, locked_targets: [] },
  };
}

/** Stringify the proposer input compactly for the prompt body. */
export function renderProposerInputMarkdown(input: ProposerInput): string {
  const exp = input.recent_experiments
    .map(
      (e) =>
        `- [${e.kept ? "kept" : "reverted"}] target=${e.target} ${e.targetRefSlug ?? ""} — ${e.changeDescription}${e.revertedReason ? ` (reason: ${e.revertedReason})` : ""}`,
    )
    .join("\n");
  return `## Run summary
\`\`\`json
${JSON.stringify(input.summary, null, 2)}
\`\`\`

## 5 worst scenarios (by composite)
\`\`\`json
${JSON.stringify(input.worst5, null, 2)}
\`\`\`

## Last 10 experiments
${exp || "(none)"}

## Baseline lock
${input.baseline_lock.active ? `ACTIVE — do NOT propose target ∈ {${input.baseline_lock.locked_targets.join(", ")}}` : "inactive"}

## Curated hints (sha=${input.hints_sha})
${input.hints_markdown || "(none)"}
`;
}

// Re-export the whitelists so tests can verify the firewall directly.
export const _ALLOWED_RESULT_KEYS = ALLOWED_RESULT_KEYS;
export const _ALLOWED_SUMMARY_KEYS = ALLOWED_SUMMARY_KEYS;
