/* ════════════════════════════════════════════════════════════════════════
   Auto-research orchestrator.

   For each iteration:
     1. assertCleanWorkdir()                     — refuse on dirty tree
     2. failure-summary builds proposer input    — rubric stripped
     3. proposer.propose() → ProposalSchema      — LLM call
     4. dispatch(proposal) → applier             — exactly one mutation
     5. snapshot()                                — git stash for revert
     6. runEval()                                 — full 30 scenarios
     7. regression-gate.decide(before, after)    — keep/revert verdict
     8. log experiments row                       — proposalJson + sha + reason
     9. commit() OR revert()                       — workdir reconciliation

   CLI:
     pnpm tsx scripts/auto-research.ts --iterations=N [--dry-run]
   ════════════════════════════════════════════════════════════════════════ */

import { promises as fs } from "node:fs";
import path from "node:path";
import { desc } from "drizzle-orm";
import { runEval } from "../eval/runner";
import { getDb } from "../lib/db";
import { experiments } from "../lib/db/schema";
import { propose, type Proposal } from "../lib/autoresearch/proposer";
import {
  dispatch,
  ApplierFailedError,
  LawyerLockedError,
  revertClause,
} from "../lib/autoresearch/applier";
import { decide, type RunSummary } from "../lib/autoresearch/regression-gate";
import {
  assertCleanWorkdir,
  assertInRepo,
  changedPaths,
  commit as gitCommit,
  frozenAssetTouched,
  revert as gitRevert,
  snapshot,
} from "../lib/autoresearch/git";
import { DAILY_SPEND_CAP_USD } from "../lib/autoresearch/config";
import type { ExperimentRow } from "../lib/autoresearch/failure-summary";

type Args = { iterations: number; dryRun: boolean };

function parseArgs(): Args {
  const get = (name: string) => {
    const a = process.argv.find((x) => x.startsWith(`--${name}=`));
    return a?.split("=").slice(1).join("=");
  };
  const iterations = get("iterations") ? parseInt(get("iterations")!) : 1;
  const dryRun = process.argv.includes("--dry-run");
  return { iterations, dryRun };
}

const PER_ITER_TIMEOUT_MS = 20 * 60 * 1000;

function runId(): string {
  return `ar-${Date.now().toString(36)}`;
}

function shortDescribe(p: Proposal): string {
  switch (p.target) {
    case "threshold":
      return `${p.key}→${p.new_value}`;
    case "weights":
      return `${p.key} weights → ${JSON.stringify(p.new_weights)}`;
    case "prompt":
      return `prompt:${p.name} replaced`;
    case "clause":
      return `clause:${p.slug} replaced`;
  }
}

async function recentExperiments(): Promise<ExperimentRow[]> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(experiments)
      .orderBy(desc(experiments.createdAt))
      .limit(10);
    return rows.map((r) => ({
      id: r.id,
      changeDescription: r.changeDescription,
      target: r.target,
      targetRefSlug: r.targetRefSlug,
      beforeScore: r.beforeScore,
      afterScore: r.afterScore,
      kept: r.kept,
      revertedReason: r.revertedReason,
      createdAt: r.createdAt as unknown as string,
    }));
  } catch (err) {
    console.warn("[orchestrator] could not load recent experiments:", (err as Error).message);
    return [];
  }
}

/**
 * Build the baseline_lock signal: if the last K experiments on a single
 * target all reverted, tell the proposer to avoid that target this round.
 */
function computeBaselineLock(rows: ExperimentRow[]): { active: boolean; locked_targets: string[] } {
  const locked = new Set<string>();
  for (const target of ["threshold", "weights", "prompt", "clause"] as const) {
    const sameTarget = rows.filter((r) => r.target === target).slice(0, 5);
    if (sameTarget.length >= 5 && sameTarget.every((r) => !r.kept)) {
      locked.add(target);
    }
  }
  return { active: locked.size > 0, locked_targets: [...locked] };
}

async function dailySpendOk(): Promise<boolean> {
  // Lightweight gate: count today's experiments and assume an avg cost per
  // iteration. Real $ tracking would need provider-side billing feeds; this
  // is the conservative default the plan calls for.
  try {
    const db = getDb();
    const rows = await db
      .select({ id: experiments.id, createdAt: experiments.createdAt })
      .from(experiments)
      .orderBy(desc(experiments.createdAt))
      .limit(50);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = rows.filter((r) => new Date(r.createdAt) >= startOfDay).length;
    // Empirically: each iteration is ~30 generations + ~30 judges + 1 proposer.
    // Gemini 2.5 flash + pro at current pricing ≈ $0.10–0.15 per iteration.
    const avgCost = 0.15;
    const projected = todayCount * avgCost;
    if (projected >= DAILY_SPEND_CAP_USD) {
      console.error(`[spend-cap] ${todayCount} runs today × $${avgCost} ≈ $${projected.toFixed(2)} ≥ cap $${DAILY_SPEND_CAP_USD}`);
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

async function logExperiment(args: {
  proposal: Proposal | null;
  description: string;
  before: number | null;
  after: number | null;
  kept: boolean;
  scoreBreakdown: unknown;
  mutationSha: string | null;
  revertedReason: string | null;
  targetRefSlug: string | null;
}): Promise<void> {
  try {
    await getDb()
      .insert(experiments)
      .values({
        changeDescription: args.description,
        target: args.proposal?.target ?? "unknown",
        targetRefSlug: args.targetRefSlug,
        beforeScore: args.before === null ? null : String(args.before),
        afterScore: args.after === null ? null : String(args.after),
        kept: args.kept,
        scoreBreakdown: args.scoreBreakdown as never,
        proposalJson: args.proposal as never,
        mutationSha: args.mutationSha,
        revertedReason: args.revertedReason,
      });
  } catch (err) {
    console.warn("[orchestrator] failed to log experiment:", (err as Error).message);
  }
}

async function writeClauseSuggestion(runIdStr: string, proposal: Proposal): Promise<void> {
  if (proposal.target !== "clause") return;
  const dir = path.join(process.cwd(), "reports");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `clause-suggestions-${runIdStr}.md`);
  const md = `# Clause suggestion (${runIdStr})

**Slug**: \`${proposal.slug}\` (LAWYER-LOCKED — auto-applier refused)

## Rationale
${proposal.rationale}

## Diff summary
${proposal.diff_summary}

## Proposed body
\`\`\`markdown
${proposal.new_body_markdown}
\`\`\`
`;
  await fs.writeFile(file, md, "utf8");
  console.log(`[suggestion] wrote ${file}`);
}

async function getBaseline(): Promise<RunSummary | null> {
  // Load the prior eval run (if any). Used as `before` for the gate.
  try {
    const p = path.join(process.cwd(), "eval/.last-run.json");
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as RunSummary;
  } catch {
    return null;
  }
}

async function writeLastRun(summary: RunSummary): Promise<void> {
  const p = path.join(process.cwd(), "eval/.last-run.json");
  await fs.writeFile(p, JSON.stringify(summary, null, 2));
}

function targetRefOf(p: Proposal): string | null {
  switch (p.target) {
    case "clause":
      return p.slug;
    case "prompt":
      return p.name;
    case "threshold":
      return p.key;
    case "weights":
      return p.key;
  }
}

async function runOneIteration(opts: { dryRun: boolean }): Promise<"kept" | "reverted" | "aborted"> {
  const id = runId();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━ ${id} ━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const start = Date.now();
  const timer = setTimeout(() => {
    console.error(`[${id}] iteration timeout after ${PER_ITER_TIMEOUT_MS}ms — exiting`);
    process.exit(2);
  }, PER_ITER_TIMEOUT_MS).unref();

  try {
    assertInRepo();
    assertCleanWorkdir();

    if (!(await dailySpendOk())) {
      await logExperiment({
        proposal: null,
        description: "spend cap hit — iteration skipped",
        before: null,
        after: null,
        kept: false,
        scoreBreakdown: null,
        mutationSha: null,
        revertedReason: "spend-cap",
        targetRefSlug: null,
      });
      return "aborted";
    }

    const recent = await recentExperiments();
    const baselineLock = computeBaselineLock(recent);
    const before = await getBaseline();
    const beforeComposite = before?.composite_mean ?? null;

    // 1. PROPOSE
    console.log(`[${id}] proposing…`);
    const proposal = await propose({ recentExperiments: recent, baselineLock });
    console.log(`[${id}] proposal: ${proposal.target} — ${shortDescribe(proposal)}`);
    console.log(`[${id}] rationale: ${proposal.rationale.slice(0, 200)}`);

    if (opts.dryRun) {
      console.log(`[${id}] [dry-run] would apply, eval, gate. Skipping mutation.`);
      return "aborted";
    }

    // 2. APPLY
    let outcome;
    let lawyerLocked = false;
    try {
      outcome = await dispatch(proposal);
    } catch (err) {
      if (err instanceof LawyerLockedError) {
        lawyerLocked = true;
        await writeClauseSuggestion(id, proposal);
        await logExperiment({
          proposal,
          description: `${shortDescribe(proposal)} (lawyer-locked)`,
          before: beforeComposite,
          after: null,
          kept: false,
          scoreBreakdown: null,
          mutationSha: null,
          revertedReason: "lawyer-locked",
          targetRefSlug: targetRefOf(proposal),
        });
        return "aborted";
      }
      if (err instanceof ApplierFailedError) {
        await logExperiment({
          proposal,
          description: `${shortDescribe(proposal)} (applier failed: ${err.message})`,
          before: beforeComposite,
          after: null,
          kept: false,
          scoreBreakdown: null,
          mutationSha: null,
          revertedReason: "applier-failed",
          targetRefSlug: targetRefOf(proposal),
        });
        return "aborted";
      }
      throw err;
    }
    void lawyerLocked;

    // 3. FROZEN-ASSET FIREWALL
    const dirty = changedPaths();
    if (frozenAssetTouched(dirty)) {
      console.error(`[${id}] applier touched eval/* — aborting and reverting`);
      // Hard-reset workdir; for clause mutations, also unwind the DB row.
      try {
        if (proposal.target === "clause" && outcome.clauseVersionId) {
          await revertClause(proposal.slug, outcome.clauseVersionId);
        }
      } catch (e) {
        console.warn(`[${id}] clause-revert failed: ${(e as Error).message}`);
      }
      // git stash to drop changes (snapshot was not yet taken — use direct reset)
      await import("node:child_process").then(({ execFileSync }) => {
        execFileSync("git", ["reset", "--hard", "HEAD"]);
        execFileSync("git", ["clean", "-fd"]);
      });
      await logExperiment({
        proposal,
        description: `${shortDescribe(proposal)} (frozen-asset violation)`,
        before: beforeComposite,
        after: null,
        kept: false,
        scoreBreakdown: null,
        mutationSha: outcome.mutationSha,
        revertedReason: "frozen-asset-violation",
        targetRefSlug: targetRefOf(proposal),
      });
      return "aborted";
    }

    // 4. SNAPSHOT (so we can roll back code mutations)
    const snap = snapshot(id);

    // 5. SMOKE EVAL for prompts (cheap; aborts before paying for full 30)
    if (proposal.target === "prompt") {
      console.log(`[${id}] smoke-eval (limit=3)…`);
      try {
        await runEval({ limit: 3 });
      } catch (err) {
        console.error(`[${id}] smoke eval errored: ${(err as Error).message}`);
        gitRevert(id);
        await logExperiment({
          proposal,
          description: `${shortDescribe(proposal)} (smoke failed)`,
          before: beforeComposite,
          after: null,
          kept: false,
          scoreBreakdown: null,
          mutationSha: outcome.mutationSha,
          revertedReason: "smoke-failed",
          targetRefSlug: targetRefOf(proposal),
        });
        return "reverted";
      }
    }

    // 6. FULL EVAL
    console.log(`[${id}] full eval…`);
    const after = await runEval();
    await writeLastRun(after);
    void snap;

    // 7. GATE
    let verdict;
    if (!before) {
      // No baseline yet — keep unconditionally (this is the first eval ever).
      verdict = { keep: true, reasons: ["no prior baseline"], deltas: { composite: 0, adversarial_neutrality: 0, factual_consistency: 0, new_must_not_include_violations: 0 } };
    } else {
      verdict = await decide({ before, after });
    }
    console.log(`[${id}] verdict: ${verdict.keep ? "KEEP" : "REVERT"} — ${verdict.reasons.join("; ")}`);

    // 8. RECONCILE
    if (verdict.keep) {
      const sha = gitCommit({
        runId: id,
        message: `[autoresearch ${id}] ${shortDescribe(proposal)} (composite ${verdict.deltas.composite >= 0 ? "+" : ""}${verdict.deltas.composite.toFixed(4)})`,
      });
      console.log(`[${id}] committed ${sha.sha}`);
      await logExperiment({
        proposal,
        description: shortDescribe(proposal),
        before: beforeComposite,
        after: after.composite_mean,
        kept: true,
        scoreBreakdown: { ...after, gateDeltas: verdict.deltas },
        mutationSha: outcome.mutationSha,
        revertedReason: null,
        targetRefSlug: targetRefOf(proposal),
      });
      return "kept";
    } else {
      // Roll back code mutation via git, plus DB if clause.
      gitRevert(id);
      if (proposal.target === "clause" && outcome.clauseVersionId) {
        try {
          await revertClause(proposal.slug, outcome.clauseVersionId);
        } catch (e) {
          console.warn(`[${id}] clause-revert failed: ${(e as Error).message}`);
        }
      }
      await logExperiment({
        proposal,
        description: shortDescribe(proposal),
        before: beforeComposite,
        after: after.composite_mean,
        kept: false,
        scoreBreakdown: { ...after, gateDeltas: verdict.deltas, gateReasons: verdict.reasons },
        mutationSha: outcome.mutationSha,
        revertedReason: "regression",
        targetRefSlug: targetRefOf(proposal),
      });
      return "reverted";
    }
  } finally {
    clearTimeout(timer);
    console.log(`[${id}] elapsed ${(Date.now() - start) / 1000}s`);
  }
}

async function main() {
  const args = parseArgs();
  console.log(`Auto-research: ${args.iterations} iteration(s)${args.dryRun ? " [DRY RUN]" : ""}`);

  let kept = 0;
  let reverted = 0;
  let aborted = 0;
  for (let i = 0; i < args.iterations; i++) {
    const outcome = await runOneIteration({ dryRun: args.dryRun });
    if (outcome === "kept") kept++;
    else if (outcome === "reverted") reverted++;
    else aborted++;
  }
  console.log(`\nDone. kept=${kept} reverted=${reverted} aborted=${aborted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
