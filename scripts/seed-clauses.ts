// Loads lib/clauses/seed/*.md → clauses table, generates embeddings via Gemini.
// Also seeds pain_points and contract_templates from in-code constants.
//
// NOTE: we call Gemini's embedContent REST endpoint directly. The AI SDK v6
// `embed()` helper has a v2-compat-mode bug with @ai-sdk/google where
// `warnings:undefined` crashes the warning logger before any value is returned.

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";
import { clauses, contractTemplates, painPoints } from "../lib/db/schema";
import { ARCHETYPES } from "../lib/archetypes";
import { CONTRACT_TEMPLATES } from "../lib/contract-templates";
import { embedDocument } from "../lib/ai/embed";

const SEED_DIR = path.join(process.cwd(), "lib/clauses/seed");

type SeedFrontmatter = {
  slug: string;
  title: string;
  clause_type: string;
  applies_to_archetypes: string[];
  required_fields?: { name: string; type: string }[];
  provenance_url?: string;
  provenance_note?: string;
  lawyer_reviewed?: boolean;
};

async function readSeedClauses() {
  const entries = await fs.readdir(SEED_DIR);
  const mds = entries.filter((e) => e.endsWith(".md") && !e.startsWith("_"));
  const out = [];
  for (const file of mds) {
    const raw = await fs.readFile(path.join(SEED_DIR, file), "utf8");
    const { data, content } = matter(raw);
    out.push({ frontmatter: data as SeedFrontmatter, body: content.trim(), file });
  }
  return out;
}

const embedText = (text: string) => embedDocument(text);

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey",
    );
  }
  const db = getDb();

  // ── 1. Pain points ──────────────────────────────────────────────────────
  console.log("Seeding pain_points…");
  for (const a of ARCHETYPES) {
    await db
      .insert(painPoints)
      .values({
        slug: a.slug,
        name: a.name,
        description: a.description,
        rank: a.rank,
        defaultTemplateSlug: a.slug,
      })
      .onConflictDoNothing({ target: painPoints.slug });
  }

  // ── 2. Contract templates ───────────────────────────────────────────────
  console.log("Seeding contract_templates…");
  for (const recipe of Object.values(CONTRACT_TEMPLATES)) {
    await db
      .insert(contractTemplates)
      .values({
        slug: recipe.archetype,
        name: recipe.name,
        archetype: recipe.archetype,
        defaultClauseSlugs: recipe.defaultClauseSlugs as any,
        guidanceNotesMarkdown: recipe.guidance,
      })
      .onConflictDoNothing({ target: contractTemplates.slug });
  }

  // ── 3. Clauses with embeddings ─────────────────────────────────────────
  const seed = await readSeedClauses();
  console.log(`Seeding ${seed.length} clauses (with embeddings — this takes a minute)…`);
  let i = 0;
  for (const { frontmatter, body, file } of seed) {
    i++;
    process.stdout.write(`  [${i}/${seed.length}] ${frontmatter.slug}…`);
    const embeddingInput = `${frontmatter.title}\n\n${body}`;
    let embedding: number[] | null = null;
    try {
      embedding = await embedText(embeddingInput);
    } catch (e) {
      console.warn(`\n  ⚠ embedding failed for ${file}:`, (e as Error).message);
    }
    await db
      .insert(clauses)
      .values({
        slug: frontmatter.slug,
        title: frontmatter.title,
        clauseType: frontmatter.clause_type,
        bodyMarkdown: body,
        appliesToArchetypes: frontmatter.applies_to_archetypes as any,
        requiredFields: (frontmatter.required_fields ?? []) as any,
        provenanceUrl: frontmatter.provenance_url ?? null,
        provenanceNote: frontmatter.provenance_note ?? null,
        lawyerReviewedAt: frontmatter.lawyer_reviewed ? new Date() : null,
        embedding: embedding as any,
      })
      .onConflictDoUpdate({
        target: clauses.slug,
        set: {
          title: frontmatter.title,
          clauseType: frontmatter.clause_type,
          bodyMarkdown: body,
          appliesToArchetypes: frontmatter.applies_to_archetypes as any,
          embedding: embedding as any,
          updatedAt: sql`now()`,
        },
      });
    process.stdout.write(" ✓\n");
  }

  console.log("\n✓ Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
