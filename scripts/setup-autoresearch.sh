#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#   Auto-research bootstrap.
#
#   Run on a fresh laptop after `git clone`. Idempotent — safe to re-run.
#
#   Steps:
#     0. Sanity-check prerequisites: pnpm, node ≥ 20, git
#     1. Install node deps
#     2. Verify .env.local exists (or prompt to fill from .env.example)
#     3. Push schema to Postgres (creates the experiments columns)
#     4. Run a smoke eval (limit=3) to confirm Gemini + DB are wired
#     5. Optional: calibrate noise floor (full eval × 2 — costs ~$0.30)
#     6. Optional: install launchd plist (every-2hr loop)
#
#   Usage:
#     bash scripts/setup-autoresearch.sh
#     bash scripts/setup-autoresearch.sh --skip-calibrate --skip-launchd
# ════════════════════════════════════════════════════════════════════════

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

SKIP_CALIBRATE=false
SKIP_LAUNCHD=false
for arg in "$@"; do
  case "$arg" in
    --skip-calibrate) SKIP_CALIBRATE=true ;;
    --skip-launchd)   SKIP_LAUNCHD=true ;;
    --help|-h)
      sed -n '2,20p' "$0"; exit 0 ;;
  esac
done

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
warn()  { printf '\033[33m⚠ %s\033[0m\n' "$*"; }
ok()    { printf '\033[32m✓ %s\033[0m\n' "$*"; }
die()   { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── 0. Prereqs ─────────────────────────────────────────────────────────
bold "[0/6] Prerequisites"
command -v git    >/dev/null || die "git not found"
command -v node   >/dev/null || die "node not found (install Node 20+)"
command -v pnpm   >/dev/null || die "pnpm not found (https://pnpm.io/installation)"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "node $NODE_MAJOR detected, need ≥ 20"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not inside a git repo"
ok "node $(node -v), pnpm $(pnpm -v), git ok"

# ── 1. Install deps ────────────────────────────────────────────────────
bold "[1/6] Installing dependencies"
pnpm install --frozen-lockfile
ok "deps installed"

# ── 2. Env file ────────────────────────────────────────────────────────
bold "[2/6] Checking .env.local"
if [ ! -f .env.local ]; then
  warn ".env.local missing. Create it with at minimum:"
  cat <<'EOF'

  DATABASE_URL=postgres://...                # Neon serverless postgres URL
  GOOGLE_GENERATIVE_AI_API_KEY=AIza...        # Gemini API key

  Run `vercel env pull .env.local` if the project is Vercel-linked.
EOF
  die ".env.local required to continue"
fi

# Lightweight check — confirm both keys are present.
grep -q '^DATABASE_URL=' .env.local            || die "DATABASE_URL missing in .env.local"
grep -q '^GOOGLE_GENERATIVE_AI_API_KEY=' .env.local || die "GOOGLE_GENERATIVE_AI_API_KEY missing in .env.local"
ok ".env.local has DATABASE_URL + GOOGLE_GENERATIVE_AI_API_KEY"

# ── 3. DB schema push ─────────────────────────────────────────────────
bold "[3/6] Pushing schema (drizzle-kit push)"
pnpm db:push
ok "schema synced"

# ── 4. Smoke eval ──────────────────────────────────────────────────────
bold "[4/6] Smoke eval (limit=3, ~30s)"
pnpm dotenv -e .env.local -- pnpm tsx eval/runner.ts --limit=3
ok "smoke eval ran — wiring confirmed"

# ── 5. Calibrate noise floor (optional) ────────────────────────────────
if $SKIP_CALIBRATE; then
  warn "[5/6] Skipping noise-floor calibration (--skip-calibrate)"
else
  bold "[5/6] Calibrating noise floor (2× full eval, ~6 min, ~\$0.30)"
  read -r -p "Run calibration now? [y/N] " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    pnpm autoresearch:calibrate
    ok "EPSILON_NOISE updated in lib/autoresearch/config.ts"
  else
    warn "skipped — run \`pnpm autoresearch:calibrate\` later"
  fi
fi

# ── 6. launchd install (optional, macOS only) ──────────────────────────
if $SKIP_LAUNCHD; then
  warn "[6/6] Skipping launchd install (--skip-launchd)"
elif [[ "$(uname)" != "Darwin" ]]; then
  warn "[6/6] Not macOS — launchd skipped (use cron or systemd)"
else
  bold "[6/6] launchd LaunchAgent (runs every 2 hours)"
  PLIST="$HOME/Library/LaunchAgents/com.musicians-legit.autoresearch.plist"
  read -r -p "Install LaunchAgent at $PLIST? [y/N] " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    # Re-write the plist with the actual repo path so the user's checkout
    # location doesn't have to match Finn's.
    SHELL_WRAP="$REPO_DIR/infra/launchd/run-autoresearch.sh"
    chmod +x "$SHELL_WRAP"

    # Patch the wrapper's hardcoded REPO path to this machine's checkout.
    if [[ "$REPO_DIR" != "/Users/finnbennett/Library/Mobile Documents/com~apple~CloudDocs/Web Dev/Musicians-Legit" ]]; then
      warn "Patching repo path in run-autoresearch.sh to $REPO_DIR"
      # Use python to avoid sed escape headaches with paths containing tildes/spaces.
      python3 -c "
import sys, re
p = '$SHELL_WRAP'
s = open(p).read()
s = re.sub(r'^REPO=.*\$', 'REPO=\"$REPO_DIR\"', s, count=1, flags=re.M)
open(p, 'w').write(s)
"
    fi

    mkdir -p "$HOME/Library/LaunchAgents"
    # Generate a plist with paths populated for THIS machine.
    cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.musicians-legit.autoresearch</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SHELL_WRAP</string>
  </array>
  <key>StartInterval</key>
  <integer>7200</integer>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/musicians-legit-autoresearch.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/musicians-legit-autoresearch.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
EOF
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    ok "LaunchAgent loaded — first fire in ≤ 2hr"
    ok "tail logs:  tail -f \$HOME/Library/Logs/musicians-legit-autoresearch.log"
  else
    warn "skipped — see musiclegit-autoresearch.md for manual install"
  fi
fi

echo
bold "Done."
echo "Run a single iteration manually:    pnpm autoresearch -- --iterations=1"
echo "Dry-run 3 iterations:                pnpm autoresearch -- --iterations=3 --dry-run"
echo "Weekly UX advisory:                  pnpm autoresearch:ux"
