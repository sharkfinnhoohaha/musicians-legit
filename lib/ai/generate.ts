// Generate a structured contract from retrieved clauses + the user's scenario.
// Single AI SDK generateText call with Output.object returning a strict-schema object.

import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL_ID, getProvider, isAiAvailable } from "./provider";
import type { RetrievedClause } from "./retrieve";
import type { Classification } from "./classify";
import { assembleFromTemplate } from "@/lib/fallback/template-assembly";
import { loadPrompt } from "./prompts";

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

// System prompt is now externalized to lib/ai/prompts/generate.system.md so the auto-research
// loop can mutate it. DO NOT inline this string back — it would silently break the prompt applier.

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
      system: loadPrompt("generate"),
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
