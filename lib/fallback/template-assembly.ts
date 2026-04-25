// Deterministic contract assembly — no AI required.
// Picks the right template recipe, fetches its clauses (or uses retrieved ones),
// interpolates {{placeholders}}, and returns a structured contract.

import { CONTRACT_TEMPLATES } from "@/lib/contract-templates";
import type { Classification } from "@/lib/ai/classify";
import type { RetrievedClause } from "@/lib/ai/retrieve";
import type { GeneratedContract } from "@/lib/ai/generate";
import type { ArchetypeSlug } from "@/lib/archetypes";
import { getDb } from "@/lib/db";
import { clauses as clausesTable } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function assembleFromTemplate(args: {
  scenarioText: string;
  classification: Classification;
  retrievedClauses: RetrievedClause[];
}): Promise<GeneratedContract> {
  const { scenarioText, classification, retrievedClauses } = args;
  const archetype = (classification.archetypes[0]?.slug ?? "split-sheet") as ArchetypeSlug;
  const recipe = CONTRACT_TEMPLATES[archetype];

  // Prefer clauses we already retrieved — fall back to recipe's defaults from DB.
  let usedClauses: { slug: string; title: string; bodyMarkdown: string }[] = retrievedClauses.map((c) => ({
    slug: c.slug,
    title: c.title,
    bodyMarkdown: c.bodyMarkdown,
  }));

  if (usedClauses.length === 0 && recipe.defaultClauseSlugs.length > 0) {
    try {
      const db = getDb();
      const rows = await db
        .select({ slug: clausesTable.slug, title: clausesTable.title, bodyMarkdown: clausesTable.bodyMarkdown })
        .from(clausesTable)
        .where(inArray(clausesTable.slug, recipe.defaultClauseSlugs));
      usedClauses = rows;
    } catch {
      // DB unavailable — produce a minimal stub so the UI still renders something
      usedClauses = [
        {
          slug: "stub",
          title: "Placeholder",
          bodyMarkdown:
            "_Contract clause library is empty. Run `pnpm db:seed` to populate clauses, then try again._",
        },
      ];
    }
  }

  // Interpolate {{placeholders}} from extracted_fields
  const placeholders: Record<string, string> = {};
  for (const p of classification.extracted_fields.parties) {
    if (!placeholders.party_a_legal_name && p.name) placeholders.party_a_legal_name = p.name;
    else if (!placeholders.party_b_legal_name && p.name) placeholders.party_b_legal_name = p.name;
  }
  Object.entries(classification.extracted_fields.percentages).forEach(([k, v], i) => {
    placeholders[`pct_${i}`] = `${v}%`;
  });
  if (classification.extracted_fields.term_months) {
    placeholders.term_months = String(classification.extracted_fields.term_months);
  }

  const interpolate = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, key) => placeholders[key] ?? `{{${key}}}`);

  const sections = usedClauses.map((c) => ({
    heading: c.title,
    body_markdown: interpolate(c.bodyMarkdown),
    source_clause_slug: c.slug,
    notes_for_user:
      "This clause was assembled from a template — review carefully before signing. AI was not used.",
  }));

  return {
    contract_title: recipe.name,
    plain_english_summary:
      `${recipe.guidance} This DRAFT was assembled deterministically from your scenario without AI.`,
    parties: classification.extracted_fields.parties.length > 0
      ? classification.extracted_fields.parties.map((p) => ({
          role: p.role,
          name: p.name ?? "{{party_name}}",
        }))
      : [
          { role: "Party A", name: "{{party_a_legal_name}}" },
          { role: "Party B", name: "{{party_b_legal_name}}" },
        ],
    sections,
    open_questions_for_user: classification.missing_critical_fields.map(
      (f) => `Please provide: ${f.replace(/_/g, " ")}`,
    ),
    recommended_next_steps: [
      "Have a music attorney review before signing.",
      "Replace any remaining {{placeholder}} values with your actual terms.",
      "Consider re-running with an AI key for higher-quality drafting.",
    ],
  };
}
