// Loads eval/scenarios.json into the eval_scenarios table. Idempotent.
// After this runs, scenarios are LOCKED — never modify them directly.

import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "../lib/db";
import { evalScenarios } from "../lib/db/schema";

type Scenario = {
  id: string;
  scenario_text: string;
  archetype: string;
  expected_clause_slugs: string[];
  rubric_criteria: Record<string, unknown>;
  source_inspiration?: string;
  is_locked?: boolean;
};

async function main() {
  const file = path.join(process.cwd(), "eval/scenarios.json");
  const raw = await fs.readFile(file, "utf8");
  const scenarios: Scenario[] = JSON.parse(raw);
  const db = getDb();

  console.log(`Seeding ${scenarios.length} eval scenarios…`);
  for (const s of scenarios) {
    await db
      .insert(evalScenarios)
      .values({
        id: s.id,
        scenarioText: s.scenario_text,
        archetype: s.archetype,
        expectedClauseSlugs: s.expected_clause_slugs as any,
        rubricCriteria: s.rubric_criteria as any,
        sourceInspiration: s.source_inspiration ?? null,
        isLocked: true,
      })
      .onConflictDoNothing({ target: evalScenarios.id });
  }
  console.log("✓ Eval scenarios seeded and LOCKED.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
