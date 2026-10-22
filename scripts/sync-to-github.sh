#!/usr/bin/env bash
# Auto-sync local project state to GitHub (commit + push).
# Safe defaults: respects .gitignore (.env, raw/, public/data, public/media, …).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_DIR="${ROOT}/.cursor/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/github-sync.log"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "ERROR: not a git repository"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  # Stage everything allowed by .gitignore
  git add -A

  # Refuse if secrets slipped in despite gitignore (.env.example is allowed)
  if git diff --cached --name-only \
    | grep -E '(^|/)\.env($|\..+)|(^|/)credentials|(^|/)secrets' \
    | grep -Ev '(^|/)\.env\.example$' >/dev/null; then
    log "ERROR: refusing to commit env/secret files — unstage and check .gitignore"
    git reset HEAD -- .env '.env.*' 2>/dev/null || true
    git add -A -- ':!.env' ':!.env.*' ':.env.example' 2>/dev/null || true
    exit 1
  fi

  if git diff --cached --quiet; then
    log "Nothing staged after add (all ignored) — skip"
    exit 0
  fi

  MSG="chore: auto-sync $(date -u '+%Y-%m-%d %H:%MZ')"
  git commit -m "$MSG" || {
    log "ERROR: commit failed"
    exit 1
  }
  log "Committed: $MSG"
else
  log "Working tree clean — nothing to commit"
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  git push origin "HEAD"
  log "Pushed $BRANCH → origin"
else
  git push -u origin "HEAD"
  log "Pushed $BRANCH → origin (upstream set)"
fi

exit 0
