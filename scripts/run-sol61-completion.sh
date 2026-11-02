#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" != --awake ]]; then
  exec /usr/bin/caffeinate -i -s /bin/bash "$0" --awake
fi
export SOL61_COMPLETION_POWER_GUARD=1
export SOL61_DEFER_JUDGE=1
export BENCH_CORPUS_V1=/private/tmp/sol61-completion-corpus-v1-20261031
export BENCH_CONCURRENCY=3
export BENCH_SCRATCH=/private/tmp/bench-scratch
export TZ=Asia/Tokyo
state=results/sol61-completion
mkdir -p "$state"
lock="$state/.run-lock"
if ! mkdir "$lock" 2>/dev/null; then
  pid=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ -z "$pid" ]] || kill -0 "$pid" 2>/dev/null; then
    echo "Sol completion already active (pid=${pid:-starting}); refusing duplicate" >&2
    exit 3
  fi
  rm "$lock/pid"
  rmdir "$lock"
  mkdir "$lock"
fi
echo $$ > "$lock/pid"
trap 'rm -f "$lock/pid"; rmdir "$lock"' EXIT
for set in hard extreme code45; do
  export BENCH_SET="$set"
  export BENCH_RESULTS_DIR="$state/$set"
  python3 scripts/check-sol61-completion-inputs.py
  pnpm exec tsx bench/sol61-completion.ts
  python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
  python3 scripts/verify-sol61-completion.py --partial
  python3 scripts/report-sol61-completion.py
done
export BENCH_RESULTS_DIR="$state/code45"
pnpm exec tsx bench/sol61-completion-grade.ts
python3 scripts/verify-sol61-completion.py
python3 scripts/report-sol61-completion.py
# Publish only after manual test/config review and final preservation QA.
