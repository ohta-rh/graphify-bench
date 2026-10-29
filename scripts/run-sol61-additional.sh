#!/bin/bash
# Sol apex + brownfield: 96 total cells, preserving the earlier 36 brownfield runs.
set -euo pipefail
cd "$(dirname "$0")/.."
export BENCH_CORPUS_V1="${BENCH_CORPUS_V1:-/private/tmp/sol61-additional-corpus-v1-20261014}"
export BENCH_CONCURRENCY=3
export BENCH_SCRATCH=/private/tmp/bench-scratch
export TZ=Asia/Tokyo
state=results/sol61-additional
mkdir -p "$state"
lock="$state/.run-lock"
if ! mkdir "$lock" 2>/dev/null; then
  pid=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ -z "$pid" ]] || kill -0 "$pid" 2>/dev/null; then
    echo "Sol additional job already active (pid=${pid:-starting}); refusing duplicate" >&2
    exit 3
  fi
  rm "$lock/pid"
  rmdir "$lock"
  mkdir "$lock"
fi
echo $$ > "$lock/pid"
trap 'rm -f "$lock/pid"; rmdir "$lock"' EXIT
for set in brownfield apex; do
  export BENCH_SET="$set"
  export BENCH_RESULTS_DIR="results/sol61-$set"
  pnpm exec tsx bench/sol61-additional.ts
  python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
  python3 "scripts/verify-sol61-$set.py"
  python3 "scripts/report-sol61-$set.py"
done
# Shared HTML publication happens only after manual test/config and scope review.
