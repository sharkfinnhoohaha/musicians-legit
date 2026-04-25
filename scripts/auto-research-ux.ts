/* ════════════════════════════════════════════════════════════════════════
   UX advisory miner. Reads last 7 days of `generation_feedback` rows joined
   to `generated_contracts`, buckets failure reasons via a single batched
   LLM call, and writes a markdown report under reports/. NEVER edits code.

   Buckets:
     wrong-archetype | missing-clause | tone-too-legalese | confidence-too-low
     | placeholder-not-filled | hallucinated-fact | other

   Usage:
     pnpm tsx scripts/auto-research-ux.ts
   ════════════════════════════════════════════════════════════════════════ */

import { promises as fs } from "node:fs";
import path from "node:path";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";
import { JUDGE_MODEL_ID } from "../lib/ai/provider";

type FeedbackRow = {
  id: string;
  rating: number | null;
  was_copied: boolean | null;
  what_was_wrong: string | null;
  archetype: string | null;
  scenario_input: string;
  output_markdown: string;
  confidence_score: string | null;
  created_at: Date;
};

const BUCKETS = [
  "wrong-archetype",
  "missing-clause",
  "tone-too-legalese",
  "confidence-too-low",
  "placeholder-not-filled",
  "hallucinated-fact",
  "other",
] as const;

const BucketsEnum = z.enum(BUCKETS);

const ItemSchema = z.object({
  feedback_id: z.string(),
  bucket: BucketsEnum,
  one_line_summary: z.string(),
});

const BatchSchema = z.object({
  items: z.array(ItemSchema),
});

async function loadFeedback(): Promise<FeedbackRow[]> {
  const db = getDb();
  const res = await db.execute<FeedbackRow>(sql`
    SELECT
      f.id,
      f.rating,
      f.was_copied,
      f.what_was_wrong,
      g.archetype,
      g.scenario_input,
      g.output_markdown,
      g.confidence_score,
      f.created_at
    FROM generation_feedback f
    JOIN generated_contracts g ON g.id = f.contract_id
    WHERE f.created_at >= NOW() - INTERVAL '7 days'
      AND ((f.rating IS NOT NULL AND f.rating <= 2) OR f.was_copied = false)
    ORDER BY f.created_at DESC
    LIMIT 200
  `);
  return res.rows;
}

async function bucketize(rows: FeedbackRow[]) {
  if (rows.length === 0) return { items: [] as z.infer<typeof ItemSchema>[] };

  const blob = rows
    .map(
      (r) =>
        `[${r.id}] archetype=${r.archetype ?? "?"} rating=${r.rating ?? "?"} copied=${r.was_copied ?? "?"} confidence=${r.confidence_score ?? "?"}\nscenario: ${r.scenario_input.slice(0, 300)}\ncomplaint: ${r.what_was_wrong ?? "(none)"}\noutput-preview: ${r.output_markdown.slice(0, 400)}`,
    )
    .join("\n---\n");

  const { output } = await generateText({
    model: google(JUDGE_MODEL_ID),
    output: Output.object({ schema: BatchSchema }),
    system: `You are a UX failure analyst for an AI contract generator. For each feedback row, classify the *primary* failure mode into exactly one bucket. The buckets are:
- wrong-archetype: the system picked the wrong contract type for the scenario
- missing-clause: a critical clause was absent
- tone-too-legalese: the output read as too lawyer-y for the user's audience
- confidence-too-low: the system was uncertain and the user wanted decisiveness
- placeholder-not-filled: TBDs, "[NAME]" or similar slipped into the final output
- hallucinated-fact: the output asserted something not supported by the input
- other: anything else

Return one item per feedback row. The one_line_summary must be your own paraphrase of the failure, not a quote.`,
    prompt: `Classify these ${rows.length} feedback rows:\n\n${blob}`,
    temperature: 0.1,
  });
  return output;
}

function aggregate(rows: FeedbackRow[], items: z.infer<typeof ItemSchema>[]) {
  const byBucket = new Map<string, number>();
  for (const it of items) byBucket.set(it.bucket, (byBucket.get(it.bucket) ?? 0) + 1);

  const archetypeStats = new Map<
    string,
    { total: number; copied: number; lowRated: number }
  >();
  for (const r of rows) {
    const a = r.archetype ?? "unknown";
    const s = archetypeStats.get(a) ?? { total: 0, copied: 0, lowRated: 0 };
    s.total++;
    if (r.was_copied === true) s.copied++;
    if (r.rating !== null && r.rating <= 2) s.lowRated++;
    archetypeStats.set(a, s);
  }

  return { byBucket, archetypeStats };
}

function renderMarkdown(args: {
  rows: FeedbackRow[];
  items: z.infer<typeof ItemSchema>[];
  byBucket: Map<string, number>;
  archetypeStats: Map<string, { total: number; copied: number; lowRated: number }>;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const bucketLines = [...args.byBucket.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([b, n]) => `- **${b}**: ${n}`)
    .join("\n");

  const archLines = [...args.archetypeStats.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([a, s]) =>
        `- **${a}**: n=${s.total}, copy-rate ${s.total > 0 ? ((s.copied / s.total) * 100).toFixed(0) : "0"}%, low-rated ${s.lowRated}`,
    )
    .join("\n");

  const samples = args.items
    .slice(0, 10)
    .map((it) => `- [${it.bucket}] ${it.one_line_summary}`)
    .join("\n");

  return `# UX hypotheses — ${today}

Window: last 7 days. Sample: ${args.rows.length} feedback rows.

## Failure-bucket distribution
${bucketLines || "(no failures)"}

## Per-archetype copy-rate
${archLines || "(no data)"}

## Sampled summaries
${samples || "(none)"}

## Hypotheses

> _These are advisory only. The auto-research code-mutation loop never reads
> this file directly — graduate hypotheses to \`lib/autoresearch/hints.md\`
> manually after you've reviewed them._

(write hypotheses here based on the patterns above)
`;
}

async function main() {
  console.log("Mining last 7 days of feedback…");
  const rows = await loadFeedback();
  console.log(`Loaded ${rows.length} rows.`);
  if (rows.length === 0) {
    console.log("No qualifying feedback in window. Exiting without writing report.");
    return;
  }

  const { items } = await bucketize(rows);
  const { byBucket, archetypeStats } = aggregate(rows, items);
  const md = renderMarkdown({ rows, items, byBucket, archetypeStats });

  const dir = path.join(process.cwd(), "reports");
  await fs.mkdir(dir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `ux-hypotheses-${today}.md`);
  await fs.writeFile(file, md, "utf8");
  console.log(`Wrote ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
