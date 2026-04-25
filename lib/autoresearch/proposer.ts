// LLM proposer: discriminated-union ProposalSchema. The frozen system prompt
// lives in proposer.system.md. The user prompt is the rendered redacted
// failure summary from failure-summary.ts. We use the JUDGE-tier model
// (gemini-2.5-pro) for proposing too — proposals are the most consequential
// LLM call in the loop and we don't want to skimp.

import { generateText, Output } from "ai";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { google } from "@ai-sdk/google";
import { JUDGE_MODEL_ID } from "@/lib/ai/provider";
import {
  buildProposerInput,
  loadHints,
  loadLastRun,
  renderProposerInputMarkdown,
  type ExperimentRow,
} from "./failure-summary";

const ATOMICITY = "exactly one file or row will change";

const ClauseProposal = z.object({
  target: z.literal("clause"),
  slug: z.string().min(3),
  new_body_markdown: z.string().min(50),
  rationale: z.string().min(20),
  diff_summary: z.string().min(10),
});

const PromptProposal = z.object({
  target: z.literal("prompt"),
  name: z.enum(["classify", "generate", "rerank"]),
  new_full_prompt: z.string().min(200),
  rationale: z.string().min(20),
  diff_summary: z.string().min(10),
});

const ThresholdProposal = z.object({
  target: z.literal("threshold"),
  key: z.enum(["SEMANTIC_K", "KEYWORD_K", "RRF_K", "FINAL_TOP_N", "ARCHETYPE_BIAS"]),
  new_value: z.number(),
  rationale: z.string().min(20),
  diff_summary: z.string().min(10),
});

const WeightsProposal = z.object({
  target: z.literal("weights"),
  key: z.enum(["retrieval", "confidence"]),
  new_weights: z.record(z.string(), z.number()),
  rationale: z.string().min(20),
  diff_summary: z.string().min(10),
});

const Common = z.object({
  predicted_metric_delta: z.object({
    composite: z.number(),
    retrieval_recall: z.number().optional(),
    judge_rubric: z.number().optional(),
  }),
  atomicity_assertion: z.literal(ATOMICITY),
});

export const ProposalSchema = z
  .discriminatedUnion("target", [
    ClauseProposal,
    PromptProposal,
    ThresholdProposal,
    WeightsProposal,
  ])
  .and(Common);

export type Proposal = z.infer<typeof ProposalSchema>;

async function loadProposerSystem(): Promise<string> {
  const p = path.join(process.cwd(), "lib/autoresearch/proposer.system.md");
  return (await fs.readFile(p, "utf8")).trim();
}

export async function propose(args: {
  recentExperiments: ExperimentRow[];
  baselineLock?: { active: boolean; locked_targets: string[] };
}): Promise<Proposal> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY required for proposer");
  }

  const lastRun = await loadLastRun();
  const hints = await loadHints();
  const input = buildProposerInput({
    lastRun,
    recentExperiments: args.recentExperiments,
    hints,
    baselineLock: args.baselineLock,
  });

  const system = await loadProposerSystem();
  const userMd = renderProposerInputMarkdown(input);

  const { output } = await generateText({
    model: google(JUDGE_MODEL_ID),
    output: Output.object({ schema: ProposalSchema }),
    system,
    prompt: userMd,
    temperature: 0.4,
  });

  return output;
}
