-- Auto-research extras for the experiments table.
-- Adds the three columns that the auto-research orchestrator writes alongside
-- the existing changeDescription / target / scoreBreakdown trio:
--
--   proposal_json    full Zod-validated ProposalSchema output from the LLM proposer
--                    (target, key/slug/name, new_value/new_body/new_prompt,
--                    rationale, diff_summary, predicted_metric_delta)
--   mutation_sha     content hash of the mutated artifact for attribution:
--                      target=prompt    → SHA-12 of the new prompt file
--                      target=threshold → SHA-12 of "<KEY>=<NEW_VALUE>"
--                      target=weights   → SHA-12 of JSON.stringify(new_weights)
--                      target=clause    → SHA-12 of the new body_markdown
--   reverted_reason  set when kept=false. Vocabulary:
--                      "regression"               regression-gate said composite/neutrality/etc dropped
--                      "lawyer-locked"            clause applier refused (lawyer_reviewed_at IS NOT NULL)
--                      "timeout"                  per-iteration 20-min hard cap hit
--                      "applier-failed"           applier threw before eval ran
--                      "frozen-asset-violation"   proposer/applier touched eval/* paths
--                      "spend-cap"                daily spend cap exceeded mid-iteration
--                      "smoke-failed"             prompt smoke eval (limit=3) errored
--                      "drift-floor"              every-10th re-baseline check failed
--
-- All three are nullable: legacy rows from scripts/run-experiment.ts predate them.

ALTER TABLE experiments
  ADD COLUMN IF NOT EXISTS proposal_json   jsonb,
  ADD COLUMN IF NOT EXISTS mutation_sha    text,
  ADD COLUMN IF NOT EXISTS reverted_reason text;
