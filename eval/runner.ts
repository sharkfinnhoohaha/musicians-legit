/* ════════════════════════════════════════════════════════════════════════
   FROZEN EVAL RUNNER — DO NOT MODIFY AFTER LAUNCH.
   This file is the yardstick the auto-research loop measures against.
   Changing it invalidates all historical experiment scores.
   See docs/AUTORESEARCH.md for the rationale (Karpathy autoresearch §prepare.py).

   ── REBASELINE BOUNDARY ──────────────────────────────────────────────────
   Patched once on the autoresearch-loop introduction commit:
     • per-scenario raw judge `scores` are now exposed in results[]
     • run-level summary now includes per-dimension means,
       `adversarial_neutrality_mean`, and `vague_followup_compliance`
   The composite scoring math (WEIGHTS, formula) is UNCHANGED. Numerical
   composite scores from before this commit are still comparable.
   This file is re-frozen as of this patch. Do not edit again.
   ════════════════════════════════════════════════════════════════════════ */

import { promises as fs } from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { classifyScenario } from "../lib/ai/classify";
import { retrieveClauses } from "../lib/ai/retrieve";
import { generateContract, renderContractMarkdown } from "../lib/ai/generate";
import { JUDGE_MODEL_ID } from "../lib/ai/provider";

const WEIGHTS = {
  retrieval_recall: 0.4,
  judge_rubric_pass_rate: 0.35,
  factual_consistency: 0.15,
  latency_penalty: 0.1,
} as const;

const LATENCY_TARGET_MS = 12_000; // p50 target

const JudgeSchema = z.object({
  scores: z.object({
    clarity: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
    factual_consistency: z.number().min(0).max(1),
    follows_rubric: z.number().min(0).max(1),
    includes_disclaimer: z.number().min(0).max(1),
    neutrality: z.number().min(0).max(1),
  }),
  overall: z.number().min(0).max(1),
  notes: z.string(),
});

type Scenario = {
  id: string;
  scenario_text: string;
  archetype: string;
  expected_clause_slugs: string[];
  rubric_criteria: Record<string, unknown>;
};

async function loadFrozenAssets() {
  const scenarios = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "eval/scenarios.json"), "utf8"),
  ) as Scenario[];
  const judgePrompt = await fs.readFile(path.join(process.cwd(), "eval/judge-prompt.md"), "utf8");
  return { scenarios, judgePrompt };
}

async function runOne(s: Scenario, judgePrompt: string) {
  const t0 = Date.now();

  // Pipeline
  const { classification } = await classifyScenario(s.scenario_text);
  const archetypes = classification.archetypes.map((a) => a.slug);
  const { clauses: retrieved, avgSimilarity } = await retrieveClauses({
    scenarioText: s.scenario_text,
    archetypes,
  });
  const { contract } = await generateContract({
    scenarioText: s.scenario_text,
    classification,
    retrievedClauses: retrieved,
  });
  const markdown = renderContractMarkdown(contract);
  const latencyMs = Date.now() - t0;

  // ── Metric 1: retrieval recall ──────────────────────────────────────────
  const expected = new Set(s.expected_clause_slugs);
  const got = new Set(retrieved.map((c) => c.slug));
  const hits = [...expected].filter((slug) => got.has(slug)).length;
  const retrieval_recall = expected.size === 0 ? 1 : hits / expected.size;

  // ── Metric 2 & 3: LLM-judge rubric + factual consistency ────────────────
  const judgePromptFull =
    judgePrompt +
    `\n\n## Scenario\n${s.scenario_text}\n\n## Expected archetype\n${s.archetype}\n\n## Rubric criteria\n${JSON.stringify(s.rubric_criteria, null, 2)}\n\n## Generated contract\n${markdown}`;

  const { output: judgeResult } = await generateText({
    model: google(JUDGE_MODEL_ID),
    output: Output.object({ schema: JudgeSchema }),
    prompt: judgePromptFull,
    temperature: 0.0,
  });

  const judgeAvg =
    (judgeResult.scores.clarity +
      judgeResult.scores.completeness +
      judgeResult.scores.follows_rubric +
      judgeResult.scores.includes_disclaimer +
      judgeResult.scores.neutrality) /
    5;
  const factual_consistency = judgeResult.scores.factual_consistency;

  // ── Metric 4: latency penalty (1.0 at target, decays) ───────────────────
  const latency_penalty = Math.max(0, 1 - Math.max(0, latencyMs - LATENCY_TARGET_MS) / LATENCY_TARGET_MS);

  const composite =
    WEIGHTS.retrieval_recall * retrieval_recall +
    WEIGHTS.judge_rubric_pass_rate * judgeAvg +
    WEIGHTS.factual_consistency * factual_consistency +
    WEIGHTS.latency_penalty * latency_penalty;

  return {
    id: s.id,
    archetype: s.archetype,
    composite,
    retrieval_recall,
    judge_rubric_pass_rate: judgeAvg,
    factual_consistency,
    latency_penalty,
    latencyMs,
    avgSimilarity,
    retrievedSlugs: [...got],
    expectedSlugs: [...expected],
    judgeNotes: judgeResult.notes,
    // Rebaseline patch: full per-dimension judge scores so the regression gate
    // can compute adversarial_neutrality_mean and similar derived aggregates
    // outside the runner. Generated markdown is preserved so the regression
    // gate can run rubric.must_not_include checks without re-querying the model.
    judgeScores: judgeResult.scores,
    generatedMarkdown: markdown,
  };
}

export async function runEval(opts: { limit?: number } = {}) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY required for eval (judge model)");
  }
  const { scenarios, judgePrompt } = await loadFrozenAssets();
  const subset = opts.limit ? scenarios.slice(0, opts.limit) : scenarios;
  console.log(`Running frozen eval on ${subset.length} scenarios…`);

  const results = [];
  for (const s of subset) {
    process.stdout.write(`  ${s.id} (${s.archetype})…`);
    try {
      const r = await runOne(s, judgePrompt);
      results.push(r);
      process.stdout.write(` ${(r.composite * 100).toFixed(1)}%\n`);
    } catch (e) {
      process.stdout.write(` ✗ ${(e as Error).message}\n`);
    }
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

  // Rebaseline patch: derived aggregates the regression gate needs.
  // Adversarial scenario IDs are pinned per eval/judge-prompt.md §"Aggregation across the 30 scenarios".
  const ADVERSARIAL_IDS = new Set(["scn-015", "scn-027", "scn-030"]);
  const VAGUE_IDS = new Set(["scn-003", "scn-008", "scn-012", "scn-018", "scn-026"]);

  const adversarialNeutralities = results
    .filter((r) => ADVERSARIAL_IDS.has(r.id))
    .map((r) => r.judgeScores.neutrality);
  const vagueFollowupPasses = results
    .filter((r) => VAGUE_IDS.has(r.id))
    .map((r) => (r.judgeScores.follows_rubric >= 0.7 ? 1 : 0));

  const summary = {
    n: results.length,
    composite_mean: mean(results.map((r) => r.composite)),
    retrieval_recall_mean: mean(results.map((r) => r.retrieval_recall)),
    judge_rubric_mean: mean(results.map((r) => r.judge_rubric_pass_rate)),
    factual_consistency_mean: mean(results.map((r) => r.factual_consistency)),
    latency_p50_ms: median(results.map((r) => r.latencyMs)),
    // Per-dimension means — derived, not part of the composite formula.
    judge_dimension_means: {
      clarity: mean(results.map((r) => r.judgeScores.clarity)),
      completeness: mean(results.map((r) => r.judgeScores.completeness)),
      factual_consistency: mean(results.map((r) => r.judgeScores.factual_consistency)),
      follows_rubric: mean(results.map((r) => r.judgeScores.follows_rubric)),
      includes_disclaimer: mean(results.map((r) => r.judgeScores.includes_disclaimer)),
      neutrality: mean(results.map((r) => r.judgeScores.neutrality)),
    },
    adversarial_neutrality_mean:
      adversarialNeutralities.length > 0 ? mean(adversarialNeutralities) : 1,
    vague_followup_compliance:
      vagueFollowupPasses.length > 0 ? mean(vagueFollowupPasses) : 1,
    weights: WEIGHTS,
    results,
  };

  console.log(`\n=== EVAL SUMMARY ===`);
  console.log(`composite: ${(summary.composite_mean * 100).toFixed(2)}%`);
  console.log(`recall:    ${(summary.retrieval_recall_mean * 100).toFixed(2)}%`);
  console.log(`judge:     ${(summary.judge_rubric_mean * 100).toFixed(2)}%`);
  console.log(`factual:   ${(summary.factual_consistency_mean * 100).toFixed(2)}%`);
  console.log(`p50:       ${summary.latency_p50_ms}ms`);
  return summary;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;
  runEval({ limit })
    .then(async (s) => {
      const out = path.join(process.cwd(), "eval/.last-run.json");
      await fs.writeFile(out, JSON.stringify(s, null, 2));
      console.log(`Wrote ${out}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
