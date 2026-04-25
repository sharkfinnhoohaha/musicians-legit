#!/bin/bash
# Wrapper for launchd. cd into the repo, source env, run one iteration.
# Hard-codes the repo path so launchd doesn't depend on shell init.

set -euo pipefail

REPO="/Users/finnbennett/Library/Mobile Documents/com~apple~CloudDocs/Web Dev/Musicians-Legit"
LOG="$HOME/Library/Logs/musicians-legit-autoresearch.log"

cd "$REPO"

# Source .env.local if present (DATABASE_URL, GOOGLE_GENERATIVE_AI_API_KEY).
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . .env.local
  set +a
fi

echo "════════════════════════════════════════════════════════════════════"
echo "$(date '+%Y-%m-%d %H:%M:%S')  starting autoresearch iteration"
echo "════════════════════════════════════════════════════════════════════"

# pnpm should be on PATH via the plist's EnvironmentVariables. Use exec so
# launchd captures the real exit code.
exec /opt/homebrew/bin/pnpm tsx scripts/auto-research.ts --iterations=1 >> "$LOG" 2>&1
