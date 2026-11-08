#!/usr/bin/env bash
# Scheduled catalog sync on the Windows VPS (Git Bash, Task Scheduler task
# `renderz-daily-catalog`). Install a copy at /c/opt/renderz/bin/daily-catalog.sh:
# do not point the task at this file, because `git pull` below rewrites it
# while bash is still reading it.
set -euo pipefail
cd /c/opt/renderz
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/renderz_deploy -o IdentitiesOnly=yes"

LOG=/c/opt/renderz/daily-catalog.log
exec >>"$LOG" 2>&1
echo "===== $(date -Is) start ====="

git checkout -- package-lock.json
git checkout main
git pull --ff-only origin main
npm install --no-audit --no-fund

status=0
npx --yes tsx --env-file=.env.local scripts/scheduled-catalog-sync.ts || status=$?

VERCEL_TOKEN=$(sed -n 's/^VERCEL_TOKEN=["'\'']\{0,1\}\([^"'\'']*\).*/\1/p' .env.local)
if [ -n "$VERCEL_TOKEN" ]; then
  npx --yes vercel cache invalidate --tag player-list --yes \
    --project prj_qaczLSOtZsp156aOYHZ8ULy4uv2P \
    --scope team_Os99QO6BurA8ahyo9Fevqp7L \
    --token "$VERCEL_TOKEN" || echo "vercel cache invalidate failed"
else
  echo "VERCEL_TOKEN not set; player-list cache expires on its own (30 min)"
fi

echo "===== $(date -Is) done status=$status ====="
exit "$status"
