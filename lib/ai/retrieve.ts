// Hybrid retrieval: pgvector semantic + pg_trgm keyword + Reciprocal Rank Fusion + LLM rerank.

import { generateText, Output } from "ai";
import { embedQuery } from "./embed";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { clauses } from "@/lib/db/schema";
import { DEFAULT_MODEL_ID, getProvider, isAiAvailable } from "./provider";
import type { ArchetypeSlug } from "@/lib/archetypes";

const SEMANTIC_K = 30;
const KEYWORD_K = 30;
const RRF_K = 60; // reciprocal-rank-fusion smoothing constant
const FINAL_TOP_N = 12;

export type RetrievedClause = {
  id: string;
  slug: string;
  title: string;
  bodyMarkdown: string;
  clauseType: string;
  appliesToArchetypes: string[];
  lawyerReviewed: boolean;
  retrievalScore: number; // RRF score before rerank
  rerankScore?: number;
};

export async function retrieveClauses(args: {
  scenarioText: string;
  archetypes: ArchetypeSlug[];
  byoKey?: string | null;
}): Promise<{ clauses: RetrievedClause[]; avgSimilarity: number; usedFallback: boolean }> {
  const { scenarioText, archetypes, byoKey } = args;
  const db = getDb();

  type Row = {
    id: string;
    slug: string;
    title: string;
    body_markdown: string;
    clause_type: string;
    applies_to_archetypes: string[];
    lawyer_reviewed_at: Date | null;
    sim: number;
  };

  // ── Keyword search via pg_trgm (always runs — no AI needed) ─────────────
  const keywordRes = await db.execute<Row>(sql`
    SELECT id, slug, title, body_markdown, clause_type, applies_to_archetypes,
           lawyer_reviewed_at,
           similarity(body_markdown || ' ' || title, ${scenarioText}) AS sim
    FROM clauses
    ORDER BY sim DESC
    LIMIT ${KEYWORD_K}
  `);
  const keywordRows: Row[] = keywordRes.rows;

  // ── Semantic search via embeddings (skipped if no AI available) ─────────
  let semanticRows: Row[] = [];
  let usedFallback = false;
  if (isAiAvailable(byoKey)) {
    try {
      const embedding = await embedQuery(scenarioText, byoKey);
      const vec = `[${embedding.join(",")}]`;
      const semRes = await db.execute<Row>(sql`
        SELECT id, slug, title, body_markdown, clause_type, applies_to_archetypes,
               lawyer_reviewed_at,
               1 - (embedding <=> ${vec}::vector) AS sim
        FROM clauses
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vec}::vector
        LIMIT ${SEMANTIC_K}
      `);
      semanticRows = semRes.rows;
    } catch (err) {
      console.warn("[retrieve] embedding call failed, using keyword-only:", err);
      usedFallback = true;
    }
  } else {
    usedFallback = true;
  }

  // ── Reciprocal Rank Fusion ──────────────────────────────────────────────
  const rrf = new Map<string, { row: Row; score: number }>();
  const fuse = (rows: Row[]) => {
    rows.forEach((row, idx) => {
      const k = row.id;
      const incr = 1 / (RRF_K + idx + 1);
      const existing = rrf.get(k);
      if (existing) existing.score += incr;
      else rrf.set(k, { row, score: incr });
    });
  };
  fuse(keywordRows);
  fuse(semanticRows);

  // ── Archetype bias: boost rows whose archetypes overlap classified ones ─
  for (const entry of rrf.values()) {
    const overlap = (entry.row.applies_to_archetypes ?? []).some((a) =>
      archetypes.includes(a as ArchetypeSlug),
    );
    if (overlap) entry.score *= 1.5;
  }

  let candidates = [...rrf.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, FINAL_TOP_N * 2)
    .map(({ row, score }) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      bodyMarkdown: row.body_markdown,
      clauseType: row.clause_type,
      appliesToArchetypes: row.applies_to_archetypes ?? [],
      lawyerReviewed: !!row.lawyer_reviewed_at,
      retrievalScore: score,
    })) as RetrievedClause[];

  // ── Optional LLM rerank for the top candidates ──────────────────────────
  if (isAiAvailable(byoKey) && candidates.length > FINAL_TOP_N) {
    try {
      candidates = await llmRerank(scenarioText, candidates, byoKey);
    } catch (err) {
      console.warn("[retrieve] rerank failed, using RRF order:", err);
    }
  }

  const top = candidates.slice(0, FINAL_TOP_N);
  const avgSim =
    top.length > 0 ? top.reduce((s, c) => s + (c.rerankScore ?? c.retrievalScore), 0) / top.length : 0;

  return { clauses: top, avgSimilarity: clampSim(avgSim), usedFallback };
}

const RerankSchema = z.object({
  ranked_slugs: z.array(z.object({ slug: z.string(), score: z.number().min(0).max(1) })),
});

async function llmRerank(
  scenarioText: string,
  candidates: RetrievedClause[],
  byoKey?: string | null,
): Promise<RetrievedClause[]> {
  const provider = getProvider(byoKey);
  const list = candidates
    .map((c, i) => `${i + 1}. [${c.slug}] ${c.title} — ${c.bodyMarkdown.slice(0, 200)}`)
    .join("\n");
  const { output } = await generateText({
    model: provider(DEFAULT_MODEL_ID),
    output: Output.object({ schema: RerankSchema }),
    system: "Score how relevant each clause is to the user's scenario from 0 (irrelevant) to 1 (essential). Output the ranked list, most relevant first.",
    prompt: `Scenario: ${scenarioText}\n\nClauses:\n${list}`,
    temperature: 0.0,
  });
  const scoreMap = new Map(output.ranked_slugs.map((r) => [r.slug, r.score]));
  return candidates
    .map((c) => ({ ...c, rerankScore: scoreMap.get(c.slug) ?? 0 }))
    .sort((a, b) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0));
}

function clampSim(n: number): number {
  return Math.max(0, Math.min(1, n));
}
