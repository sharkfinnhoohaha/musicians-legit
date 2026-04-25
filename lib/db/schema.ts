import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/* ─────────────────────────────────────────────────────────────────────────
   Clauses — atomic, reusable contract building blocks.
   The auto-research loop edits these (specifically clause_versions).
   ───────────────────────────────────────────────────────────────────────── */

export const clauses = pgTable(
  "clauses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    clauseType: text("clause_type").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    jurisdiction: text("jurisdiction").notNull().default("US"),
    appliesToArchetypes: text("applies_to_archetypes").array().notNull().default(sql`ARRAY[]::text[]`),
    requiredFields: jsonb("required_fields").notNull().default(sql`'[]'::jsonb`),
    provenanceUrl: text("provenance_url"),
    provenanceNote: text("provenance_note"),
    lawyerReviewedAt: timestamp("lawyer_reviewed_at"),
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    embIdx: index("clauses_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
    slugIdx: index("clauses_slug_idx").on(t.slug),
  }),
);

export const clauseVersions = pgTable("clause_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clauseId: uuid("clause_id")
    .notNull()
    .references(() => clauses.id, { onDelete: "cascade" }),
  bodyMarkdown: text("body_markdown").notNull(),
  evalScore: numeric("eval_score"),
  isCurrent: boolean("is_current").notNull().default(false),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────────────────────────
   Contract templates — recipes mapping archetypes → clause slug lists.
   ───────────────────────────────────────────────────────────────────────── */

export const contractTemplates = pgTable("contract_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  archetype: text("archetype").notNull(),
  defaultClauseSlugs: text("default_clause_slugs").array().notNull().default(sql`ARRAY[]::text[]`),
  requiredFieldsSummary: jsonb("required_fields_summary").notNull().default(sql`'[]'::jsonb`),
  guidanceNotesMarkdown: text("guidance_notes_markdown"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────────────────────────
   Pain points — the 15 archetypes with provenance.
   ───────────────────────────────────────────────────────────────────────── */

export const painPoints = pgTable("pain_points", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  rank: integer("rank").notNull(),
  sourceUrls: text("source_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  defaultTemplateSlug: text("default_template_slug"),
});

/* ─────────────────────────────────────────────────────────────────────────
   Generated contracts + feedback — the real-usage flywheel.
   ───────────────────────────────────────────────────────────────────────── */

export const generatedContracts = pgTable(
  "generated_contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id"),
    archetype: text("archetype"),
    scenarioInput: text("scenario_input").notNull(),
    conversationLog: jsonb("conversation_log").notNull().default(sql`'[]'::jsonb`),
    outputMarkdown: text("output_markdown").notNull(),
    confidenceScore: numeric("confidence_score"),
    confidenceBreakdown: jsonb("confidence_breakdown"),
    aiModelUsed: text("ai_model_used"),
    usedFallback: boolean("used_fallback").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index("generated_contracts_session_idx").on(t.sessionId),
  }),
);

export const generationFeedback = pgTable("generation_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => generatedContracts.id, { onDelete: "cascade" }),
  rating: integer("rating"),
  wasCopied: boolean("was_copied"),
  whatWasWrong: text("what_was_wrong"),
  expertCorrection: text("expert_correction"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────────────────────────
   FROZEN eval harness. Once seeded, is_locked=true and never modified.
   ───────────────────────────────────────────────────────────────────────── */

export const evalScenarios = pgTable("eval_scenarios", {
  id: text("id").primaryKey(), // matches the scn-001 string ids in scenarios.json
  scenarioText: text("scenario_text").notNull(),
  archetype: text("archetype").notNull(),
  expectedClauseSlugs: text("expected_clause_slugs").array().notNull(),
  rubricCriteria: jsonb("rubric_criteria").notNull(),
  sourceInspiration: text("source_inspiration"),
  isLocked: boolean("is_locked").notNull().default(true),
});

/* ─────────────────────────────────────────────────────────────────────────
   Experiments — autoresearch run history. Append-only.
   ───────────────────────────────────────────────────────────────────────── */

export const experiments = pgTable("experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  changeDescription: text("change_description").notNull(),
  target: text("target").notNull(), // 'clause' | 'prompt' | 'threshold' | 'weights'
  targetRefSlug: text("target_ref_slug"),
  beforeScore: numeric("before_score"),
  afterScore: numeric("after_score"),
  kept: boolean("kept").notNull(),
  scoreBreakdown: jsonb("score_breakdown"),
  // Auto-research extras (added in db/migrations/001_autoresearch_extras.sql).
  // proposalJson — full Zod-validated proposer output (target, key, new_value, rationale, predicted_metric_delta).
  // mutationSha — content hash of the mutated artifact (prompt SHA, config snippet hash, or clause body hash) for attribution.
  // revertedReason — set when kept=false; one of: "regression", "lawyer-locked", "timeout", "applier-failed", "frozen-asset-violation", "spend-cap".
  proposalJson: jsonb("proposal_json"),
  mutationSha: text("mutation_sha"),
  revertedReason: text("reverted_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────────────────────────
   Waitlist + contact submissions — for landing-page validation.
   ───────────────────────────────────────────────────────────────────────── */

export const waitlistSubscribers = pgTable(
  "waitlist_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    context: text("context"), // e.g. landing-hero | landing-cta | pricing-waitlist
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("waitlist_email_idx").on(t.email),
  }),
);

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  topic: text("topic"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* Type exports for app code */
export type Clause = typeof clauses.$inferSelect;
export type NewClause = typeof clauses.$inferInsert;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type GeneratedContract = typeof generatedContracts.$inferSelect;
export type EvalScenario = typeof evalScenarios.$inferSelect;
export type Experiment = typeof experiments.$inferSelect;
