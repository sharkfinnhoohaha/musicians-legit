# musiclegit-autoresearch — runbook

You are operating the auto-research loop for **Musicians-Legit**, a contract
generator for working musicians. Your job is to **run, monitor, and report
on** automated experiments — never to invent new strategies, change the
plan, or hand-edit the system under test. The loop is a self-improving
hill-climber; you are its operator, not its architect.

Read this file end-to-end before running anything.

---

## 0. Mental model in 30 seconds

```
proposer LLM ── proposes ONE atomic change ──→  applier ──→  eval (30 scenarios)
                                                              │
                                                              ▼
                                                    regression-gate
                                                              │
                                                  keep ◀──────┴──────▶ revert
                                                    │                    │
                                                    ▼                    ▼
                                              git commit            git stash drop
                                                    │                    │
                                                    └──── log experiments table
```

- **Frozen things you NEVER touch**: `eval/scenarios.json`,
  `eval/judge-prompt.md`, `eval/runner.ts`. Editing any of these invalidates
  every historical score. The orchestrator aborts the iteration if it
  detects a write to `eval/`.
- **The composite score** is what matters. It's a weighted blend of
  retrieval recall, judge rubric pass-rate, factual consistency, and a
  latency penalty. Reported as a percentage in eval logs.
- **Atomicity matters**: each iteration changes exactly one file or one
  database row. If you ever see an iteration touching multiple files,
  something is wrong — abort and report.

---

## 1. Prerequisites checklist

```bash
node -v        # need ≥ 20
pnpm -v        # any recent
git status     # MUST be clean before any iteration
cat .env.local | grep -E '^(DATABASE_URL|GOOGLE_GENERATIVE_AI_API_KEY)='
```

If `.env.local` is missing, ask Finn for it — do not regenerate.

---

## 2. First-time setup on a new machine

```bash
bash scripts/setup-autoresearch.sh
```

This is idempotent. It will:
1. Verify prerequisites
2. `pnpm install`
3. Confirm `.env.local`
4. Push the schema to Postgres (`pnpm db:push`)
5. Smoke-eval 3 scenarios (~30s)
6. Optionally calibrate the noise floor
7. Optionally install the launchd LaunchAgent (every-2hr loop, macOS only)

If the script aborts, **do not improvise**. Report the exact error to Finn.

---

## 3. Daily commands

| You want to... | Run |
|---|---|
| Single iteration, watch live | `pnpm autoresearch -- --iterations=1` |
| Burst of 5 iterations | `pnpm autoresearch -- --iterations=5` |
| See what proposer suggests, no apply | `pnpm autoresearch -- --iterations=1 --dry-run` |
| Run the frozen eval manually | `pnpm eval:run` |
| Run the eval on a 5-scenario subset | `pnpm eval:run -- --limit=5` |
| Weekly UX advisory mining | `pnpm autoresearch:ux` |
| Recalibrate noise floor | `pnpm autoresearch:calibrate` |

The orchestrator prints a banner per iteration:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━ ar-abc123 ━━━━━━━━━━━━━━━━━━━━━━━━━━
[ar-abc123] proposing…
[ar-abc123] proposal: threshold — RRF_K→80
[ar-abc123] rationale: retrieval_recall on the 5 worst scenarios is ...
[ar-abc123] full eval…
[ar-abc123] verdict: KEEP — composite +0.0124; adversarial_neutrality stable; ...
[ar-abc123] committed 9f3a7b2
[ar-abc123] elapsed 412s
```

A KEEP creates a git commit tagged `autoresearch/<runId>`. A REVERT
hard-resets the workdir and drops the stash. Either way, an
`experiments` row is inserted with the full proposal + verdict.

---

## 4. Monitoring the launchd-driven loop

```bash
# Live tail — most useful while debugging
tail -f $HOME/Library/Logs/musicians-legit-autoresearch.log

# Errors only
tail -f $HOME/Library/Logs/musicians-legit-autoresearch.err

# Is the agent loaded?
launchctl list | grep musicians-legit

# Force-trigger a run right now (don't wait the 2hr interval)
launchctl kickstart -k gui/$(id -u)/com.musicians-legit.autoresearch

# Pause the loop
launchctl unload $HOME/Library/LaunchAgents/com.musicians-legit.autoresearch.plist

# Resume
launchctl load $HOME/Library/LaunchAgents/com.musicians-legit.autoresearch.plist
```

---

## 5. Reading the experiments table

The `experiments` table is append-only. Useful queries (use `pnpm db:studio`
or the Neon SQL console — paste a connection string from `.env.local`):

```sql
-- 20 most recent
SELECT created_at, target, target_ref_slug, kept, before_score, after_score,
       reverted_reason, change_description
FROM experiments
ORDER BY created_at DESC
LIMIT 20;

-- Kept-rate per target type (last 50)
SELECT target,
       COUNT(*)                          AS attempted,
       SUM(CASE WHEN kept THEN 1 ELSE 0 END) AS kept,
       ROUND(100.0 * SUM(CASE WHEN kept THEN 1 ELSE 0 END) / COUNT(*), 1) AS kept_pct
FROM (SELECT * FROM experiments ORDER BY created_at DESC LIMIT 50) e
GROUP BY target;

-- Why are reverts happening?
SELECT reverted_reason, COUNT(*)
FROM experiments
WHERE kept = false AND created_at > NOW() - INTERVAL '7 days'
GROUP BY 1 ORDER BY 2 DESC;
```

Vocabulary for `reverted_reason`:
- `regression` — gate said the change made things worse
- `lawyer-locked` — applier refused to edit a reviewed clause
- `applier-failed` — proposal didn't match expected file structure
- `frozen-asset-violation` — proposal tried to touch `eval/*`
- `smoke-failed` — prompt mutation broke the system on a 3-scenario smoke test
- `spend-cap` — daily spend cap hit
- `timeout` — iteration exceeded 20 min

---

## 6. Health checks you should run weekly

1. **Trend check** — `composite_mean` should be flat or rising over the last
   30 days. If it's regressing, something is gaming the loop.
   ```sql
   SELECT DATE(created_at) AS day, AVG(after_score::numeric) AS avg_after
   FROM experiments
   WHERE kept = true AND created_at > NOW() - INTERVAL '30 days'
   GROUP BY 1 ORDER BY 1;
   ```
2. **Frozen-asset firewall** — `git log --since="30 days ago" -- eval/` MUST
   be empty. If it shows anything, the firewall has a hole. **Stop the loop
   and report immediately.**
3. **Diversity** — `kept` experiments shouldn't all be the same target. If
   the last 20 wins are all `target=prompt`, the proposer is in a local
   optimum. The orchestrator auto-locks the over-used target after 5
   consecutive reverts on it, but if it keeps re-trying anyway, tell Finn.
4. **UX hypothesis report** — `ls reports/ux-hypotheses-*.md` — a fresh
   one should appear every Monday after `pnpm autoresearch:ux` runs.

---

## 7. Failure playbook

### "Workdir is dirty" abort
```
auto-research refuses to start: workdir is dirty.
M lib/foo.ts
?? scratch.md
```
**Fix**: `git status`, commit/stash/discard whatever's there, then re-run.
**Don't** run `git reset --hard` to clear it — Finn might have in-progress
work. Always confirm with Finn first.

### Eval crashes on a Gemini error
Most Gemini errors are rate-limit related. Wait 60s and re-run. If repeated,
check `https://status.cloud.google.com/`. Report to Finn if outage.

### `applier-failed: could not locate KEY in lib/autoresearch/config.ts`
The config file's structural rules were violated. Don't edit it manually.
Run `git diff lib/autoresearch/config.ts` — if it's malformed, restore from
git and report to Finn.

### `frozen-asset-violation` reverts piling up
The proposer is repeatedly suggesting changes to `eval/`. The system prompt
in `lib/autoresearch/proposer.system.md` should forbid this. If you see ≥3
in a day, pause the loop and tell Finn.

### Composite score visibly regressing across days
Run:
```bash
pnpm autoresearch:calibrate     # recalibrates noise floor
```
If σ has grown, the loop's discrimination power has degraded — could be
Gemini model drift. Tell Finn. Don't try to fix this yourself.

---

## 8. Things you must NOT do

- ❌ Edit anything in `eval/`
- ❌ Edit `lib/autoresearch/proposer.system.md` (frozen)
- ❌ Edit `lib/autoresearch/regression-gate.ts` math (the gate is the
  scientific instrument; tampering invalidates results)
- ❌ Force-keep an experiment that the gate rejected
- ❌ Bypass the lawyer-locked clause check
- ❌ Roll back commits tagged `autoresearch/*` without telling Finn
- ❌ Run `git push --force` on the autoresearch branch
- ❌ Increase the daily spend cap above $5 without Finn's go-ahead

---

## 9. What to report back to Finn

A useful weekly summary looks like this:

> **Week of YYYY-MM-DD** — 84 iterations attempted, 12 kept, 72 reverted.
> Composite climbed from 71.4% → 73.8% (+2.4pp). Top wins: 3× prompt edits
> on `generate`, 2× threshold bumps to `RRF_K`. Reverts dominated by
> `regression` (61) and `applier-failed` (8 — all `target=clause`,
> proposer is producing slugs that don't exist; flagging). UX advisory
> highlighted producer-beat-agreement copy-rate at 38% (vs 71% mean) — the
> ux-hypotheses-2026-04-21.md file has details. **Suggested next**: review
> the producer clause set with Finn this week.

Numbers, deltas, and one or two specific call-outs. Never pad.

---

## 10. Where the source of truth lives

| Question | File |
|---|---|
| What does the proposer see? | `lib/autoresearch/failure-summary.ts` (the firewall) |
| What changes can be applied? | `lib/autoresearch/appliers/*.ts` |
| When does the gate revert? | `lib/autoresearch/regression-gate.ts` |
| What scenarios are graded? | `eval/scenarios.json` (frozen) |
| How does the judge grade? | `eval/judge-prompt.md` (frozen) |
| What scalars can change? | `lib/autoresearch/config.ts` |
| What prompts can change? | `lib/ai/prompts/{classify,generate,rerank}.system.md` |
| Daily spend cap | `DAILY_SPEND_CAP_USD` in `lib/autoresearch/config.ts` |
| Iteration cadence | `StartInterval` in `infra/launchd/com.musicians-legit.autoresearch.plist` |

When in doubt, read the source — but don't edit it without Finn's say-so.
