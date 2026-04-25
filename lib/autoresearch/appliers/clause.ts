// Clause applier — replaces clauses.body_markdown for a given slug, inserts
// a clause_versions row capturing the prior body, and re-embeds.
//
// Refuses with a hard error if `lawyer_reviewed_at IS NOT NULL` on the target
// clause. The orchestrator catches that and writes a markdown suggestion to
// reports/clause-suggestions-<runId>.md for human review instead.
//
// Returns an `embeddingDrift` cosine distance between old and new vectors;
// > 0.4 is flagged by the orchestrator (likely off-topic rewrite).

import { sql, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { clauses, clauseVersions } from "@/lib/db/schema";
import { embedDocument } from "@/lib/ai/embed";

export type ClauseResult = {
  mutationSha: string;
  oldBody: string;
  newBody: string;
  embeddingDrift: number;
  versionId: string;
};

/** Special error class so the orchestrator can route to the suggestions report. */
export class LawyerLockedError extends Error {
  constructor(slug: string) {
    super(`clause ${slug} is lawyer-reviewed and cannot be auto-edited`);
    this.name = "LawyerLockedError";
  }
}

export async function applyClause(args: {
  slug: string;
  newBodyMarkdown: string;
  changeDescription: string;
}): Promise<ClauseResult> {
  const { slug, newBodyMarkdown, changeDescription } = args;
  const newBody = newBodyMarkdown.trim();

  if (newBody.length < 50) {
    throw new Error(`clause ${slug} body too short (${newBody.length} chars)`);
  }

  const db = getDb();

  const existing = await db
    .select({
      id: clauses.id,
      bodyMarkdown: clauses.bodyMarkdown,
      lawyerReviewedAt: clauses.lawyerReviewedAt,
      title: clauses.title,
      embedding: clauses.embedding,
    })
    .from(clauses)
    .where(eq(clauses.slug, slug))
    .limit(1);

  if (existing.length === 0) throw new Error(`clause not found: ${slug}`);
  const row = existing[0];

  if (row.lawyerReviewedAt !== null) throw new LawyerLockedError(slug);

  if (newBody === row.bodyMarkdown.trim()) {
    throw new Error(`clause ${slug} body unchanged — no-op proposal`);
  }
  // Sanity bounds: 0.5×–4× of current. Clauses are short so the upper bound
  // is more permissive than for prompts.
  const oldLen = row.bodyMarkdown.trim().length;
  if (newBody.length < oldLen * 0.5 || newBody.length > oldLen * 4) {
    throw new Error(
      `clause ${slug} length ${newBody.length} outside 0.5×–4× of current ${oldLen}`,
    );
  }

  // Compute new embedding BEFORE we touch the DB so a network error rolls back cleanly.
  const newEmbedding = await embedDocument(`${row.title}\n\n${newBody}`);

  const drift = row.embedding ? cosineDistance(row.embedding as number[], newEmbedding) : 0;
  const vec = `[${newEmbedding.join(",")}]`;

  // Two writes done sequentially. neon-http doesn't support real transactions;
  // we insert the version row first so even if the UPDATE fails the rollback
  // path (revertClause) still has the snapshot to restore from.
  const inserted = await db
    .insert(clauseVersions)
    .values({
      clauseId: row.id,
      bodyMarkdown: row.bodyMarkdown,
      isCurrent: false,
      changeDescription: `auto-research: replaced (${changeDescription})`,
    })
    .returning({ id: clauseVersions.id });
  const versionId = inserted[0].id;

  await db.execute(sql`
    UPDATE clauses
    SET body_markdown = ${newBody},
        embedding = ${vec}::vector,
        updated_at = NOW()
    WHERE id = ${row.id}
  `);

  const sha = createHash("sha256").update(newBody).digest("hex").slice(0, 12);
  return {
    mutationSha: sha,
    oldBody: row.bodyMarkdown,
    newBody,
    embeddingDrift: drift,
    versionId,
  };
}

/**
 * Compensating action when the regression gate says revert. Restores the
 * clause body + embedding by reading the most recent clause_versions row,
 * deletes it, and re-embeds. Called by the orchestrator's revert path
 * because a SQL change isn't covered by `git stash`.
 */
export async function revertClause(slug: string, versionId: string): Promise<void> {
  const db = getDb();

  const vers = await db
    .select({ id: clauseVersions.id, bodyMarkdown: clauseVersions.bodyMarkdown, clauseId: clauseVersions.clauseId })
    .from(clauseVersions)
    .where(eq(clauseVersions.id, versionId))
    .limit(1);
  if (vers.length === 0) throw new Error(`version ${versionId} not found for revert`);
  const v = vers[0];

  const titleRows = await db
    .select({ title: clauses.title })
    .from(clauses)
    .where(eq(clauses.id, v.clauseId))
    .limit(1);
  const title = titleRows[0]?.title ?? "";

  const restored = await embedDocument(`${title}\n\n${v.bodyMarkdown.trim()}`);
  const vec = `[${restored.join(",")}]`;

  await db.execute(sql`
    UPDATE clauses
    SET body_markdown = ${v.bodyMarkdown},
        embedding = ${vec}::vector,
        updated_at = NOW()
    WHERE id = ${v.clauseId}
  `);
  await db.delete(clauseVersions).where(eq(clauseVersions.id, versionId));

  // Touch slug param so it isn't unused — also informational.
  void slug;
}

function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 1;
  const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return 1 - sim;
}
