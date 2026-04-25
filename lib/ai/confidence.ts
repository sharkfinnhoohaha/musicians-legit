// Transparent, weighted confidence score. The breakdown is shown in the UI.

import type { Classification } from "./classify";
import type { RetrievedClause } from "./retrieve";
import { CONFIDENCE_WEIGHTS } from "@/lib/autoresearch/config";

export type ConfidenceBreakdown = {
  retrieval_quality: number;
  classification_confidence: number;
  field_completeness: number;
  clause_review_status: number;
  jurisdiction_match: number;
  weighted_total: number;
  weights: Record<string, number>;
  notes: string[];
};

// Weights are now in lib/autoresearch/config.ts so the auto-research applier can mutate them.
const WEIGHTS = CONFIDENCE_WEIGHTS;

export function computeConfidence(args: {
  classification: Classification;
  retrievedClauses: RetrievedClause[];
  retrievalAvgSimilarity: number;
  usedFallback: boolean;
  jurisdictionMatch?: number; // 1.0 at launch (US only)
}): ConfidenceBreakdown {
  const { classification, retrievedClauses, retrievalAvgSimilarity, usedFallback, jurisdictionMatch = 1 } = args;
  const notes: string[] = [];

  const retrieval_quality = clamp01(retrievalAvgSimilarity);
  if (retrieval_quality < 0.5) notes.push("Retrieved clauses had low similarity to your scenario.");

  const classification_confidence = clamp01(
    Math.max(...classification.archetypes.map((a) => a.confidence), 0),
  );
  if (classification_confidence < 0.6) notes.push("Scenario was ambiguous — multiple archetypes matched weakly.");

  const requiredFieldCount = retrievedClauses.reduce(
    (n, c) => n + (Array.isArray((c as any).requiredFields) ? (c as any).requiredFields.length : 0),
    0,
  );
  const missingCount = classification.missing_critical_fields.length;
  const field_completeness =
    requiredFieldCount === 0
      ? 0.7
      : clamp01(1 - missingCount / Math.max(1, requiredFieldCount));
  if (missingCount > 0) notes.push(`${missingCount} critical field(s) were not provided.`);

  const reviewedCount = retrievedClauses.filter((c) => c.lawyerReviewed).length;
  const clause_review_status =
    retrievedClauses.length === 0 ? 0 : reviewedCount / retrievedClauses.length;
  if (clause_review_status < 0.5) notes.push("Most clauses used are seed text not yet attorney-reviewed.");

  const jm = clamp01(jurisdictionMatch);

  let weighted =
    WEIGHTS.retrieval_quality * retrieval_quality +
    WEIGHTS.classification_confidence * classification_confidence +
    WEIGHTS.field_completeness * field_completeness +
    WEIGHTS.clause_review_status * clause_review_status +
    WEIGHTS.jurisdiction_match * jm;

  if (usedFallback) {
    weighted = Math.min(weighted, 0.6);
    notes.push("Generated via deterministic fallback (no AI). Confidence capped at 0.60.");
  }

  return {
    retrieval_quality,
    classification_confidence,
    field_completeness,
    clause_review_status,
    jurisdiction_match: jm,
    weighted_total: clamp01(weighted),
    weights: WEIGHTS,
    notes,
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
