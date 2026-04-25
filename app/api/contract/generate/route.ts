import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { classifyScenario } from "@/lib/ai/classify";
import { retrieveClauses } from "@/lib/ai/retrieve";
import { generateContract, renderContractMarkdown } from "@/lib/ai/generate";
import { computeConfidence } from "@/lib/ai/confidence";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDb } from "@/lib/db";
import { generatedContracts } from "@/lib/db/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  scenarioText: z.string().min(5).max(5000),
  conversationLog: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  forceFallback: z.boolean().optional(),
  sessionId: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { scenarioText, conversationLog, forceFallback, sessionId } = parsed.data;

  // Identify the caller for rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const byoKey = forceFallback ? null : req.headers.get("x-byo-google-key") || null;

  // Rate-limit anonymous users without their own key
  if (!byoKey) {
    const rl = await checkRateLimit(`ip:${ip}`);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message:
            "Daily free limit reached. Add your own Google AI Studio key (free at aistudio.google.com/apikey) or sign in to continue.",
        },
        { status: 429 },
      );
    }
  }

  // ── Pipeline ────────────────────────────────────────────────────────────
  const t0 = Date.now();
  const { classification, usedFallback: classifyFallback } = await classifyScenario(
    scenarioText,
    forceFallback ? null : byoKey,
  );

  // If critical fields are missing AND we have AI, return follow-up question instead of contract
  const missingCount = classification.missing_critical_fields.length;
  const followupBudgetUsed = (conversationLog ?? []).filter((m) => m.role === "assistant").length;
  if (
    missingCount > 0 &&
    followupBudgetUsed < 4 &&
    !forceFallback &&
    !classifyFallback // only AI path can ask follow-ups
  ) {
    const nextField = classification.missing_critical_fields[0].replace(/_/g, " ");
    return NextResponse.json({
      kind: "followup",
      question: `Quick question — could you tell me the ${nextField}?`,
      missing_fields: classification.missing_critical_fields,
      classification,
    });
  }

  const archetypes = classification.archetypes.map((a) => a.slug);
  const { clauses: retrieved, avgSimilarity } = await retrieveClauses({
    scenarioText,
    archetypes,
    byoKey: forceFallback ? null : byoKey,
  });

  const { contract, usedFallback, modelUsed } = await generateContract({
    scenarioText,
    classification,
    retrievedClauses: retrieved,
    conversationLog,
    byoKey: forceFallback ? null : byoKey,
  });

  const confidence = computeConfidence({
    classification,
    retrievedClauses: retrieved,
    retrievalAvgSimilarity: avgSimilarity,
    usedFallback,
  });

  const markdown = renderContractMarkdown(contract);
  const ms = Date.now() - t0;

  // Persist (anonymously) — best-effort, don't block response on DB failure
  let contractId: string | null = null;
  try {
    const [row] = await getDb()
      .insert(generatedContracts)
      .values({
        sessionId,
        archetype: archetypes[0],
        scenarioInput: scenarioText,
        conversationLog: (conversationLog ?? []) as any,
        outputMarkdown: markdown,
        confidenceScore: String(confidence.weighted_total),
        confidenceBreakdown: confidence as any,
        aiModelUsed: modelUsed,
        usedFallback,
      })
      .returning({ id: generatedContracts.id });
    contractId = row.id;
  } catch (err) {
    console.warn("[generate] failed to persist contract:", err);
  }

  return NextResponse.json({
    kind: "contract",
    contractId,
    contract,
    markdown,
    confidence,
    archetype: archetypes[0],
    usedFallback,
    modelUsed,
    timingMs: ms,
  });
}
