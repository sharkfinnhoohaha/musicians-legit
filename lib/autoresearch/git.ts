// Thin git wrappers used by the auto-research orchestrator. Every iteration
// snapshots → mutates → evals → decides → commits-or-reverts. If git is
// unhappy, the loop refuses to start: a dirty workdir means a hand-edit is
// in flight and we'd silently overwrite it.

import { execFileSync, spawnSync } from "node:child_process";

function git(args: string[]): string {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout ?? "").trim();
}

/** Throws if the workdir has any uncommitted changes (tracked OR untracked). */
export function assertCleanWorkdir(): void {
  const out = git(["status", "--porcelain"]);
  if (out.length > 0) {
    throw new Error(
      `auto-research refuses to start: workdir is dirty.\n${out}\nCommit or stash before running.`,
    );
  }
}

/** Returns the current short SHA of HEAD. */
export function headSha(): string {
  return git(["rev-parse", "--short", "HEAD"]);
}

/** Returns the list of paths changed in the workdir vs HEAD (porcelain). */
export function changedPaths(): string[] {
  const out = git(["status", "--porcelain"]);
  if (!out) return [];
  return out
    .split("\n")
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
}

/**
 * Snapshot the workdir using `git stash --include-untracked` with a tagged
 * message. The stash is pushed *and immediately reapplied* so the working
 * tree still has the (about-to-be-mutated) state. The stash entry itself
 * is the safety net we pop from on revert.
 */
export function snapshot(runId: string): { stashRef: string } {
  // Push stash incl. untracked. If there's truly nothing to stash, git
  // exits 0 with "No local changes to save" — but we ran assertCleanWorkdir
  // first, so there *should* be nothing yet. We snapshot AFTER the applier,
  // not before. Callers should call this right before the eval run.
  git(["stash", "push", "--include-untracked", "-m", `autoresearch-${runId}`]);
  // Bring changes back so the eval runs against the mutated tree.
  git(["stash", "apply", "stash@{0}"]);
  return { stashRef: `autoresearch-${runId}` };
}

/**
 * Revert the working tree to its pre-mutation state by hard-resetting to
 * HEAD (drops tracked changes), cleaning untracked files, then dropping
 * the snapshot stash. The orchestrator only calls this *after* it has
 * already inserted the experiment row, so the audit trail survives.
 */
export function revert(runId: string): void {
  // Drop everything in the workdir (tracked changes + new files we added).
  git(["reset", "--hard", "HEAD"]);
  git(["clean", "-fd"]);
  // Find and drop our snapshot stash (it should still be at stash@{0}
  // since the orchestrator runs serialized).
  const stashes = git(["stash", "list"]).split("\n").filter(Boolean);
  const idx = stashes.findIndex((line) => line.includes(`autoresearch-${runId}`));
  if (idx >= 0) git(["stash", "drop", `stash@{${idx}}`]);
}

/**
 * Stage all current changes, create a commit with the given message, and
 * tag it with `autoresearch/<runId>` so the rolling drift-floor check can
 * find baselines.
 */
export function commit(args: { runId: string; message: string }): { sha: string } {
  // Stage every change incl. new files. Safe because the applier promised
  // atomicity (exactly one file or row), and the orchestrator already
  // verified no eval/* paths were touched.
  git(["add", "-A"]);
  git(["commit", "-m", args.message]);
  git(["tag", `autoresearch/${args.runId}`]);
  return { sha: headSha() };
}

/**
 * Returns true if any of the changed paths are inside the frozen-asset
 * firewall (anything under `eval/`). The orchestrator calls this after
 * the applier and aborts if true.
 */
export function frozenAssetTouched(paths = changedPaths()): boolean {
  return paths.some((p) => p === "eval" || p.startsWith("eval/"));
}

/** Ensure git is callable. Throws if not in a repo. */
export function assertInRepo(): void {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  } catch {
    throw new Error("auto-research must run inside a git repository");
  }
}
