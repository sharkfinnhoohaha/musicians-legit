// ════════════════════════════════════════════════════════════════════════
//   AUTO-RESEARCH TUNABLES
//
//   The auto-research applier mutates this file ONE SCALAR AT A TIME via
//   regex-edit. Strict structural rules:
//
//     • Each tunable export is a flat object literal of `KEY: number` pairs.
//     • Each pair lives on its own line, formatted exactly:
//           KEY: <number>,
//     • No expressions, only number literals.
//     • Don't add comments inside the object literals (regex finds them).
//     • New tunables must be added to KNOWN_THRESHOLD_KEYS in
//       lib/autoresearch/appliers/threshold.ts and to the proposer's enum.
// ════════════════════════════════════════════════════════════════════════

export const RETRIEVAL_CONFIG = {
  SEMANTIC_K: 30,
  KEYWORD_K: 30,
  RRF_K: 60,
  FINAL_TOP_N: 12,
  ARCHETYPE_BIAS: 1.5,
};

export const RETRIEVAL_WEIGHTS = {
  semantic: 1.0,
  keyword: 1.0,
};

export const CONFIDENCE_WEIGHTS = {
  retrieval_quality: 0.3,
  classification_confidence: 0.25,
  field_completeness: 0.2,
  clause_review_status: 0.15,
  jurisdiction_match: 0.1,
};

// Regression-gate noise floor — calibrated by scripts/calibrate-noise-floor.ts.
// 2σ of the run-to-run composite drift on a no-op double-run. Default 0.005
// is a safe starting point until calibration runs.
export const EPSILON_NOISE = 0.005;

// Per-day spend cap (USD, approximate) — auto-research refuses to start
// further iterations once today's experiments cumulatively exceed this.
// Conservative default; tune up once you've watched a few runs.
export const DAILY_SPEND_CAP_USD = 5.0;
