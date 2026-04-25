// ════════════════════════════════════════════════════════════════════════
//   REGRESSION GATE — pure function, fully unit-testable.
//
//   decide(before, after) returns { keep: boolean, reasons: string[] }.
//   ALL FOUR conditions below must hold for keep=true. Failure on any
//   single condition immediately produces a revert with the failing
//   condition explained in `reasons`. The orchestrator persists this
//   verdict alongside the experiment row.
//
//   Conditions:
//     C1  composite_mean improves by > EPSILON_NOISE
//     C2  adversarial_neutrality_mean does not drop
//     C3  zero new must_not_include violations introduced
//     C4  factual_consistency_mean drops by ≤ 0.03
//
//   The gate may read eval/scenarios.json (rubric included) — that is OK
//   because the gate's output never feeds back into the proposer. Only
//   failure-summary.ts is the proposer's input pipe.
// ════════════════════════════════════════════════════════════════════════

import { promises as fs } from "node:fs";
import path from "node:path";
import { EPSILON_NOISE } from "./config";

type JudgeScores = {
  clarity: number;
  completeness: number;
  factual_consistency: number;
  follows_rubric: number;
  includes_disclaimer: number;
  neutrality: number;
};

export type RunResult = {
  id: string;
  composite: number;
  retrieval_recall: number;
  judge_rubric_pass_rate: number;
  factual_consistency: number;
  judgeScores: JudgeScores;
  generatedMarkdown: string;
};

export type RunSummary = {
  n: number;
  composite_mean: number;
  retrieval_recall_mean: number;
  judge_rubric_mean: number;
  factual_consistency_mean: number;
  adversarial_neutrality_mean: number;
  vague_followup_compliance: number;
  results: RunResult[];
};

export type GateVerdict = {
  keep: boolean;
  reasons: string[];
  deltas: {
    composite: number;
    adversarial_neutrality: number;
    factual_consistency: number;
    new_must_not_include_violations: number;
  };
};

type Scenario = {
  id: string;
  rubric_criteria?: { must_not_include?: string[] };
};

let scenariosCache: Scenario[] | null = null;

async function loadScenarios(): Promise<Scenario[]> {
  if (scenariosCache) return scenariosCache;
  const p = path.join(process.cwd(), "eval/scenarios.json");
  scenariosCache = JSON.parse(await fs.readFile(p, "utf8")) as Scenario[];
  return scenariosCache;
}

/**
 * Count must_not_include violations across all scenarios in a run. Case-
 * insensitive substring match against the generated markdown. Mirror of
 * the same check the eval judge does, run independently here so the gate
 * doesn't have to trust the judge's neutrality score in isolation.
 */
function countMustNotIncludeViolations(
  results: RunResult[],
  scenarios: Scenario[],
): number {
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  let n = 0;
  for (const r of results) {
    const s = byId.get(r.id);
    const banned = s?.rubric_criteria?.must_not_include ?? [];
    if (banned.length === 0) continue;
    const md = r.generatedMarkdown.toLowerCase();
    for (const term of banned) {
      if (md.includes(term.toLowerCase())) n++;
    }
  }
  return n;
}

/**
 * The gate. Pass `epsilon` to override the calibrated noise floor (tests do).
 */
export async function decide(args: {
  before: RunSummary;
  after: RunSummary;
  epsilon?: number;
  scenarios?: Scenario[];
}): Promise<GateVerdict> {
  const { before, after } = args;
  const epsilon = args.epsilon ?? EPSILON_NOISE;
  const scenarios = args.scenarios ?? (await loadScenarios());

  const reasons: string[] = [];
  const deltas = {
    composite: after.composite_mean - before.composite_mean,
    adversarial_neutrality:
      after.adversarial_neutrality_mean - before.adversarial_neutrality_mean,
    factual_consistency:
      after.factual_consistency_mean - before.factual_consistency_mean,
    new_must_not_include_violations: 0,
  };

  // C1 — composite must clear noise floor.
  if (deltas.composite > epsilon) {
    reasons.push(`composite +${deltas.composite.toFixed(4)} (>ε ${epsilon})`);
  } else {
    return {
      keep: false,
      reasons: [`composite Δ=${deltas.composite.toFixed(4)} ≤ ε ${epsilon}`],
      deltas,
    };
  }

  // C2 — adversarial neutrality must not drop.
  if (deltas.adversarial_neutrality < 0) {
    return {
      keep: false,
      reasons: [
        `adversarial_neutrality dropped ${deltas.adversarial_neutrality.toFixed(4)}`,
      ],
      deltas,
    };
  }
  reasons.push("adversarial_neutrality stable");

  // C3 — zero NEW must_not_include violations. We compute the count for
  // both before and after; revert only if `after > before`. This makes the
  // gate idempotent against pre-existing violations the proposer didn't
  // introduce.
  const beforeViolations = countMustNotIncludeViolations(before.results, scenarios);
  const afterViolations = countMustNotIncludeViolations(after.results, scenarios);
  deltas.new_must_not_include_violations = afterViolations - beforeViolations;
  if (afterViolations > beforeViolations) {
    return {
      keep: false,
      reasons: [
        `must_not_include violations ${beforeViolations} → ${afterViolations}`,
      ],
      deltas,
    };
  }
  reasons.push(`no new must_not_include violations (${afterViolations})`);

  // C4 — factual_consistency may not drop more than 0.03.
  if (deltas.factual_consistency < -0.03) {
    return {
      keep: false,
      reasons: [
        `factual_consistency dropped ${deltas.factual_consistency.toFixed(4)} (>0.03)`,
      ],
      deltas,
    };
  }
  reasons.push("factual_consistency within tolerance");

  return { keep: true, reasons, deltas };
}

/** For tests: clear cached scenarios so unit tests can inject fixtures. */
export function _resetScenarioCache(): void {
  scenariosCache = null;
}
