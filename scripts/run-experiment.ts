/*
 * Karpathy-style autoresearch hill-climb.
 *
 * Workflow per experiment:
 *   1. Read current best score from `experiments` table (or run baseline)
 *   2. Apply ONE atomic change (caller specifies via --target=<file> --description=<text>)
 *   3. Run the FROZEN eval/runner.ts
 *   4. If new_score > best_score: keep, else revert
 *   5. Log to `experiments` table
 *
 * NOTE: this script is intentionally simple. The "apply change" step assumes
 * the user has already made the edit on disk (e.g. modified a clause body,
 * tweaked a prompt, changed a threshold). This runner records the result
 * and does the keep-or-revert bookkeeping via git stash if --auto-revert is set.
 */

import { execSync } from "node:child_process";
import { runEval } from "../eval/runner";
import { getDb } from "../lib/db";
import { experiments } from "../lib/db/schema";
import { desc } from "drizzle-orm";

type Args = {
  description: string;
  target: "clause" | "prompt" | "threshold" | "weights";
  targetRefSlug?: string;
  autoRevert: boolean;
  limit?: number;
};

function parseArgs(): Args {
  const get = (name: string) => {
    const a = process.argv.find((x) => x.startsWith(`--${name}=`));
    return a?.split("=").slice(1).join("=");
  };
  const description = get("description") ?? "untitled experiment";
  const target = (get("target") as Args["target"]) ?? "prompt";
  const targetRefSlug = get("ref");
  const autoRevert = process.argv.includes("--auto-revert");
  const limit = get("limit") ? parseInt(get("limit")!) : undefined;
  return { description, target, targetRefSlug, autoRevert, limit };
}

async function getCurrentBest(): Promise<number | null> {
  try {
    const db = getDb();
    const rows = await db.select().from(experiments).orderBy(desc(experiments.createdAt)).limit(50);
    const kept = rows.filter((r) => r.kept && r.afterScore !== null);
    if (kept.length === 0) return null;
    return Math.max(...kept.map((r) => parseFloat(r.afterScore as unknown as string)));
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs();
  console.log(`\n▶ Experiment: ${args.description}`);
  console.log(`  target: ${args.target}${args.targetRefSlug ? ` (${args.targetRefSlug})` : ""}`);

  const before = await getCurrentBest();
  console.log(`  current best: ${before === null ? "n/a (baseline)" : (before * 100).toFixed(2) + "%"}`);

  const summary = await runEval({ limit: args.limit });
  const after = summary.composite_mean;

  const kept = before === null ? true : after > before;
  console.log(
    `\n${kept ? "✅ KEEP" : "↩ REVERT"}: ${(after * 100).toFixed(2)}% (Δ ${
      before === null ? "—" : ((after - before) * 100).toFixed(2) + "pp"
    })`,
  );

  if (!kept && args.autoRevert) {
    console.log("Auto-reverting via git stash…");
    try {
      execSync("git stash push --include-untracked -m 'autoresearch revert'", { stdio: "inherit" });
    } catch (e) {
      console.warn("git stash failed — please revert manually:", (e as Error).message);
    }
  }

  // Log
  try {
    await getDb().insert(experiments).values({
      changeDescription: args.description,
      target: args.target,
      targetRefSlug: args.targetRefSlug ?? null,
      beforeScore: before === null ? null : String(before),
      afterScore: String(after),
      kept,
      scoreBreakdown: summary as any,
    });
  } catch (e) {
    console.warn("Failed to log experiment to DB:", (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
