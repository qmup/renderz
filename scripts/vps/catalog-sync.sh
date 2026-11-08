#!/usr/bin/env bash
# Catalog sync on the Windows VPS (Git Bash, Task Scheduler tasks
# `renderz-catalog-head` and `renderz-catalog-full`).
#   catalog-sync.sh head   new players from the sitemap head only
#   catalog-sync.sh full   every sync step
# Install a copy at /c/opt/renderz/bin/catalog-sync.sh: do not point the tasks
# at this file, because `git pull` below rewrites it while bash is still
# reading it.
set -euo pipefail
MODE=${1:-full}
case "$MODE" in
  head | full) ;;
  *) echo "usage: $0 head|full" >&2; exit 2 ;;
esac

cd /c/opt/renderz
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/renderz_deploy -o IdentitiesOnly=yes"

LOG=/c/opt/renderz/catalog-sync.log
exec >>"$LOG" 2>&1
echo "===== $(date -Is) start mode=$MODE ====="

# The head and full tasks can overlap (a head run that finds a new event can
# outlast the next trigger). A head run gives way; a full run waits. A lock
# older than 4 hours is left over from a killed run.
LOCK=/c/opt/renderz/catalog-sync.lock
until mkdir "$LOCK" 2>/dev/null; do
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +240 2>/dev/null)" ]; then
    echo "removing stale lock"
    rmdir "$LOCK"
    continue
  fi
  if [ "$MODE" = head ]; then
    echo "===== $(date -Is) skipped: another sync is running ====="
    exit 0
  fi
  sleep 60
done
trap 'rmdir "$LOCK"' EXIT

git checkout -- package-lock.json
git checkout main
git pull --ff-only origin main
npm install --no-audit --no-fund

status=0
CATALOG_SYNC_MODE=$MODE npx --yes tsx --env-file=.env.local scripts/scheduled-catalog-sync.ts || status=$?

VERCEL_TOKEN=$(sed -n 's/^VERCEL_TOKEN=["'\'']\{0,1\}\([^"'\'']*\).*/\1/p' .env.local)
if [ -n "$VERCEL_TOKEN" ]; then
  npx --yes vercel cache invalidate --tag player-list --yes \
    --project prj_qaczLSOtZsp156aOYHZ8ULy4uv2P \
    --scope team_Os99QO6BurA8ahyo9Fevqp7L \
    --token "$VERCEL_TOKEN" || echo "vercel cache invalidate failed"
else
  echo "VERCEL_TOKEN not set; player-list cache expires on its own (30 min)"
fi

echo "===== $(date -Is) done mode=$MODE status=$status ====="
exit "$status"
