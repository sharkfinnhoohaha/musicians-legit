// Classify a free-text scenario into archetype(s) + extract entities + flag missing fields.
// Single cheap structured-output call. Falls back to keyword heuristics if AI unavailable.

import { generateText, Output } from "ai";
import { z } from "zod";
import { ARCHETYPE_SLUGS, type ArchetypeSlug } from "@/lib/archetypes";
import { DEFAULT_MODEL_ID, getProvider, isAiAvailable } from "./provider";
import { keywordClassify } from "@/lib/fallback/classifier";
import { extractFields } from "@/lib/fallback/extractor";

const ClassificationSchema = z.object({
  archetypes: z
    .array(
      z.object({
        slug: z.enum(ARCHETYPE_SLUGS as [ArchetypeSlug, ...ArchetypeSlug[]]),
        confidence: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(3),
  extracted_fields: z.object({
    parties: z.array(z.object({ role: z.string(), name: z.string().nullable() })).default([]),
    percentages: z.record(z.string(), z.number()).default({}),
    monetary_amounts: z.record(z.string(), z.number()).default({}),
    term_months: z.number().nullable().default(null),
    exclusivity: z.boolean().nullable().default(null),
    territory: z.string().nullable().default(null),
    jurisdiction_hint: z.string().nullable().default(null),
    notes: z.string().default(""),
  }),
  missing_critical_fields: z.array(z.string()).default([]),
  scenario_summary: z.string(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

const SYSTEM_PROMPT = `You are a music-industry contract intake assistant.
Given a free-text scenario from an indie musician, classify which contract archetype(s) apply, extract any factual entities mentioned, and flag any CRITICAL missing fields the user must clarify before a contract can be drafted.

Rules:
- NEVER cite specific statutes, court cases, or regulations.
- If the scenario is ambiguous, list the missing fields needed to disambiguate — do not guess.
- "Critical" missing fields are ones whose absence would force the contract to use placeholder values (e.g., royalty %, party identity, term length, exclusivity).
- Set confidence < 0.6 for any archetype whose match is weak.
- scenario_summary: ONE sentence neutral restatement.`;

export async function classifyScenario(
  scenarioText: string,
  byoKey?: string | null,
): Promise<{ classification: Classification; usedFallback: boolean }> {
  if (!isAiAvailable(byoKey)) {
    return { classification: classifyFallback(scenarioText), usedFallback: true };
  }

  try {
    const provider = getProvider(byoKey);
    const { output } = await generateText({
      model: provider(DEFAULT_MODEL_ID),
      output: Output.object({ schema: ClassificationSchema }),
      system: SYSTEM_PROMPT,
      prompt: `Scenario:\n${scenarioText}`,
      temperature: 0.1,
    });
    return { classification: output, usedFallback: false };
  } catch (err) {
    console.warn("[classify] AI call failed, using fallback:", err);
    return { classification: classifyFallback(scenarioText), usedFallback: true };
  }
}

function classifyFallback(scenarioText: string): Classification {
  const archetypeMatches = keywordClassify(scenarioText);
  const fields = extractFields(scenarioText);
  return {
    archetypes:
      archetypeMatches.length > 0
        ? archetypeMatches
        : [{ slug: "split-sheet", confidence: 0.3 }], // safe default
    extracted_fields: {
      parties: fields.parties,
      percentages: fields.percentages,
      monetary_amounts: fields.monetary,
      term_months: fields.termMonths,
      exclusivity: null,
      territory: null,
      jurisdiction_hint: null,
      notes: "Extracted via deterministic fallback (no AI used).",
    },
    missing_critical_fields: fields.missingFields,
    scenario_summary: scenarioText.slice(0, 200),
  };
}
