# Musicians Legit

AI-drafted music contracts for indie artists, grounded in real US music-industry conventions. Type a plain-English scenario, get a draft contract back with a transparent confidence score.

> ⚠️ **Not legal advice.** This tool produces drafts only. Read every clause and have a music attorney review before signing.

---

## Architecture (one-paragraph version)

A user describes their situation. The system **classifies** it into one of 15 archetypes (split sheet, producer/beat, sync license, gig contract, etc.), **extracts** entities and missing fields, and asks **follow-up questions** when needed (max 4). It then runs a **hybrid retrieval** (pgvector semantic + pg_trgm keyword + RRF fusion + LLM rerank) over a clause library sourced from public-domain materials, **generates** a structured contract via the AI SDK with strict schema validation, and renders a **transparent confidence score** (5 weighted components). When AI is unavailable or rate-limited, a **deterministic template-assembly fallback** kicks in. The system improves itself via a **Karpathy-style auto-research loop**: a frozen 30-scenario eval harness scores every change as a single composite metric, and changes are kept only if they hill-climb.

See `docs/superpowers/specs/` (or the plan file in your `~/.claude/plans/`) for the full design.

---

## Getting Started

### 1. Install

```bash
pnpm install
```

### 2. Provision services on Vercel

```bash
# Link the project
vercel link

# Add Neon Postgres + Upstash Redis from the Marketplace.
# These auto-provision env vars on Vercel.
vercel integration add neon
vercel integration add upstash

# Pull env vars locally
vercel env pull .env.local
```

### 3. Add your free Gemini key

Get one at https://aistudio.google.com/apikey and add it to `.env.local`:

```
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```

### 4. Set up the database

```bash
pnpm db:push                          # creates tables via Drizzle
pnpm tsx scripts/setup-extensions.ts  # installs pgvector + pg_trgm + trigram index
pnpm db:seed                          # loads ~30 starter clauses w/ embeddings
pnpm tsx scripts/seed-eval-scenarios.ts # loads the FROZEN eval harness
```

### 5. Run

```bash
pnpm dev
# open http://localhost:3000
```

---

## How it works

| Stage | File | Notes |
|---|---|---|
| Classify | `lib/ai/classify.ts` | Single structured-output call → archetype + extracted fields + missing-fields list |
| Hybrid retrieve | `lib/ai/retrieve.ts` | pgvector + pg_trgm + RRF + optional LLM rerank |
| Generate | `lib/ai/generate.ts` | `generateText` + `Output.object` with strict Zod schema |
| Confidence | `lib/ai/confidence.ts` | Transparent 5-component weighted score |
| Fallback | `lib/fallback/*` | Keyword classifier + regex extractor + template assembly. Always works without AI. |
| API | `app/api/contract/generate/route.ts` | Orchestrates the pipeline, persists to DB, handles rate limits + BYO key header |
| UI | `app/page.tsx` + `components/contract-view.tsx` | Gemini-style minimal input, drawer output, hover-to-explain confidence |

### Auto-research loop (Karpathy-style)

The eval harness is **frozen** — `eval/runner.ts`, `eval/scenarios.json`, and `eval/judge-prompt.md` must never be edited after launch. They are the yardstick.

```bash
# Run the frozen eval (use --limit=N for faster iteration)
pnpm eval:run --limit=10

# Run an experiment: make ONE atomic change, then run this with a description.
# Keeps the change if the composite score improves vs. last kept run.
pnpm experiment --target=clause --ref=split-sheet--ownership-percentages \
                --description="Tighten ownership-percentages clause language"

# With auto-revert (git stash on regression)
pnpm experiment --target=prompt --description="Try terser system prompt" --auto-revert
```

What the loop measures (composite, single number):

- 40% — retrieval recall (did we surface the expected clauses?)
- 35% — LLM-judge rubric pass rate (clarity, completeness, etc.)
- 15% — factual consistency (no hallucinated statutes/cases)
- 10% — latency penalty (decays past p50 target)

---

## Production readiness checklist

Before charging anyone real money:

- [ ] Paralegal review of every clause in `lib/clauses/seed/`. Set `lawyer_reviewed: true` in frontmatter when reviewed.
- [ ] Form an LLC.
- [ ] Carry E&O insurance.
- [ ] Review the disclaimer language with an attorney.
- [ ] Add Stripe / paywall for users beyond the free tier.
- [ ] Wire up Vercel Web Analytics + Speed Insights.
- [ ] Add an "Email this to a music attorney for $X" affiliate option.

---

## Disclaimer

Musicians Legit produces DRAFTS based on common US music-industry conventions. It is not legal advice. The operators are not liable for any errors or outcomes. For high-stakes deals, consult a licensed music attorney.

---

## License

TBD by the user.
