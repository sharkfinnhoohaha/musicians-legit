// Applier dispatcher — routes a validated Proposal to the right applier
// and normalizes the result shape so the orchestrator can write a uniform
// experiments row regardless of target type.

import { applyThreshold, type ThresholdKey } from "./appliers/threshold";
import { applyWeights, type WeightsKey } from "./appliers/weights";
import { applyPrompt } from "./appliers/prompt";
import { applyClause, LawyerLockedError, revertClause } from "./appliers/clause";
import type { Proposal } from "./proposer";
import type { PromptName } from "@/lib/ai/prompts";

export type ApplyOutcome = {
  mutationSha: string;
  // For DB-only mutations (clause), this is the version ID we need to roll
  // back outside `git stash`. Undefined for git-tracked mutations.
  clauseVersionId?: string;
  // Diagnostic detail for logging.
  detail: Record<string, unknown>;
};

export class ApplierFailedError extends Error {
  constructor(
    msg: string,
    public readonly cause?: unknown,
  ) {
    super(msg);
    this.name = "ApplierFailedError";
  }
}

export { LawyerLockedError, revertClause };

export async function dispatch(p: Proposal): Promise<ApplyOutcome> {
  try {
    switch (p.target) {
      case "threshold": {
        const r = await applyThreshold({ key: p.key as ThresholdKey, newValue: p.new_value });
        return {
          mutationSha: r.mutationSha,
          detail: { key: p.key, oldValue: r.oldValue, newValue: r.newValue },
        };
      }
      case "weights": {
        const r = await applyWeights({ key: p.key as WeightsKey, newWeights: p.new_weights });
        return {
          mutationSha: r.mutationSha,
          detail: { key: p.key, oldWeights: r.oldWeights, newWeights: r.newWeights },
        };
      }
      case "prompt": {
        const r = await applyPrompt({ name: p.name as PromptName, newFullPrompt: p.new_full_prompt });
        return {
          mutationSha: r.mutationSha,
          detail: { name: p.name, oldLen: r.oldLen, newLen: r.newLen },
        };
      }
      case "clause": {
        const r = await applyClause({
          slug: p.slug,
          newBodyMarkdown: p.new_body_markdown,
          changeDescription: p.diff_summary,
        });
        return {
          mutationSha: r.mutationSha,
          clauseVersionId: r.versionId,
          detail: {
            slug: p.slug,
            embeddingDrift: r.embeddingDrift,
            oldLen: r.oldBody.length,
            newLen: r.newBody.length,
          },
        };
      }
    }
  } catch (err) {
    // Re-throw lawyer-locked unchanged so orchestrator can route to suggestions report.
    if (err instanceof LawyerLockedError) throw err;
    throw new ApplierFailedError((err as Error).message, err);
  }
}
