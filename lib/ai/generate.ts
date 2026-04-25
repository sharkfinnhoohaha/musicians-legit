// Generate a structured contract from retrieved clauses + the user's scenario.
// Single AI SDK generateText call with Output.object returning a strict-schema object.

import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL_ID, getProvider, isAiAvailable } from "./provider";
import type { RetrievedClause } from "./retrieve";
import type { Classification } from "./classify";
import { assembleFromTemplate } from "@/lib/fallback/template-assembly";

export const ContractSchema = z.object({
  contract_title: z.string(),
  plain_english_summary: z.string(),
  parties: z.array(
    z.object({
      role: z.string(),
      name: z.string(),
      details: z.string().optional(),
    }),
  ),
  sections: z.array(
    z.object({
      heading: z.string(),
      body_markdown: z.string(),
      source_clause_slug: z.string().nullable(),
      notes_for_user: z.string(),
    }),
  ),
  open_questions_for_user: z.array(z.string()).default([]),
  recommended_next_steps: z.array(z.string()).default([]),
});

export type GeneratedContract = z.infer<typeof ContractSchema>;

const SYSTEM_PROMPT = `You are drafting a US-jurisdiction music-industry contract using the clause library provided.

ABSOLUTE RULES:
- DO NOT cite any statute, US Code section, regulation, court case, or legal precedent. Use general industry conventions only.
- DO NOT promise legal validity. The output is a DRAFT for the user to review with an attorney.
- DO use plain-English. Define capitalized terms ("Party", "Effective Date") on first use.
- DO interpolate any {{placeholder}} fields from extracted_fields. If a placeholder has no value, leave it as the {{placeholder}} for the user to fill in — do NOT invent values.
- DO assemble the contract using the provided clauses where they fit. Add transition language where needed. You MAY rewrite clause language for clarity but the substantive terms must match.
- For each section, set source_clause_slug to the slug of the clause used (or null for purely connective text).
- notes_for_user: 1-2 sentences in plain English explaining WHY this section exists and what to watch out for.
- recommended_next_steps: include "have a music attorney review before signing" as the first item.

Output the contract as STRICT JSON matching the schema. Markdown allowed inside body_markdown.`;

export async function generateContract(args: {
  scenarioText: string;
  classification: Classification;
  retrievedClauses: RetrievedClause[];
  conversationLog?: { role: "user" | "assistant"; content: string }[];
  byoKey?: string | null;
}): Promise<{ contract: GeneratedContract; usedFallback: boolean; modelUsed: string }> {
  const { scenarioText, classification, retrievedClauses, conversationLog, byoKey } = args;

  if (!isAiAvailable(byoKey) || retrievedClauses.length === 0) {
    const fallback = await assembleFromTemplate({
      scenarioText,
      classification,
      retrievedClauses,
    });
    return { contract: fallback, usedFallback: true, modelUsed: "template-assembly" };
  }

  const clauseBlock = retrievedClauses
    .map(
      (c, i) =>
        `[${i + 1}] slug=${c.slug} type=${c.clauseType} reviewed=${c.lawyerReviewed}\nTitle: ${c.title}\n${c.bodyMarkdown}\n`,
    )
    .join("\n---\n");

  const conversationBlock =
    conversationLog && conversationLog.length > 0
      ? `\n\nFollow-up conversation:\n${conversationLog.map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : "";

  const promptArchetype = classification.archetypes[0]?.slug ?? "unknown";

  try {
    const provider = getProvider(byoKey);
    const { output } = await generateText({
      model: provider(DEFAULT_MODEL_ID),
      output: Output.object({ schema: ContractSchema }),
      system: SYSTEM_PROMPT,
      prompt: `Primary archetype: ${promptArchetype}\nExtracted fields: ${JSON.stringify(classification.extracted_fields, null, 2)}\n\nScenario:\n${scenarioText}${conversationBlock}\n\nAvailable clauses:\n${clauseBlock}`,
      temperature: 0.2,
    });
    return { contract: output, usedFallback: false, modelUsed: DEFAULT_MODEL_ID };
  } catch (err) {
    console.warn("[generate] AI call failed, using template assembly:", err);
    const fallback = await assembleFromTemplate({
      scenarioText,
      classification,
      retrievedClauses,
    });
    return { contract: fallback, usedFallback: true, modelUsed: "template-assembly" };
  }
}

/** Render the structured contract as a single markdown document. */
export function renderContractMarkdown(c: GeneratedContract): string {
  const partiesBlock = c.parties
    .map((p) => `- **${p.role}**: ${p.name}${p.details ? ` — ${p.details}` : ""}`)
    .join("\n");
  const sections = c.sections
    .map((s) => `## ${s.heading}\n\n${s.body_markdown}`)
    .join("\n\n");
  const openQ =
    c.open_questions_for_user.length > 0
      ? `\n\n---\n\n### Open Questions\n${c.open_questions_for_user.map((q) => `- ${q}`).join("\n")}`
      : "";
  const nextSteps =
    c.recommended_next_steps.length > 0
      ? `\n\n### Recommended Next Steps\n${c.recommended_next_steps.map((q) => `- ${q}`).join("\n")}`
      : "";
  return `# ${c.contract_title}\n\n_${c.plain_english_summary}_\n\n### Parties\n${partiesBlock}\n\n${sections}${openQ}${nextSteps}\n`;
}
