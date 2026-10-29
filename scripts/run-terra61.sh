#!/bin/bash
# Six complete Terra series; resume only missing cells under one global lock.
set -euo pipefail
cd "$(dirname "$0")/.."
export BENCH_CORPUS_V1=/private/tmp/terra61-corpus-v1-20261027
export BENCH_CONCURRENCY=3
export BENCH_SCRATCH=/private/tmp/bench-scratch
export TERRA61_DEFER_JUDGE=1
export TZ=Asia/Tokyo
state=results/terra61
mkdir -p "$state"
lock="$state/.run-lock"
if ! mkdir "$lock" 2>/dev/null; then
  pid=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ -z "$pid" ]] || kill -0 "$pid" 2>/dev/null; then
    echo "Terra benchmark already active (pid=${pid:-starting}); refusing duplicate" >&2
    exit 3
  fi
  rm "$lock/pid"
  rmdir "$lock"
  mkdir "$lock"
fi
echo $$ > "$lock/pid"
trap 'rm -f "$lock/pid"; rmdir "$lock"' EXIT
python3 scripts/check-terra61-inputs.py
for set in code45 hard ultra extreme apex brownfield; do
  export BENCH_SET="$set"
  export BENCH_RESULTS_DIR="$state/$set"
  python3 scripts/check-terra61-inputs.py
  pnpm exec tsx bench/terra61.ts
  python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
  if [[ "$set" == code45 ]]; then
    BENCH_RESULTS_DIR="$state/code45" pnpm exec tsx bench/terra61-grade.ts
  fi
  python3 scripts/verify-terra61.py --partial
  python3 scripts/report-terra61.py
done
python3 scripts/verify-terra61.py
# Final --publish requires manual review; the heartbeat performs it after all596.
