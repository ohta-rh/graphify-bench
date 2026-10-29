#!/bin/bash
# Resume only missing cells; lock covers solver, audit, verification and report.
set -euo pipefail
cd "$(dirname "$0")/.."
export BENCH_CORPUS_V1="${BENCH_CORPUS_V1:-/private/tmp/sol61-ultra-corpus-v1-20261009}"
export BENCH_RESULTS_DIR=results/sol61-ultra
export BENCH_CONCURRENCY=3
export BENCH_SCRATCH=/private/tmp/bench-scratch
export TZ=Asia/Tokyo
mkdir -p "$BENCH_RESULTS_DIR"
lock="$BENCH_RESULTS_DIR/.run-lock"
if ! mkdir "$lock" 2>/dev/null; then
  pid=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ -z "$pid" ]] || kill -0 "$pid" 2>/dev/null; then
    echo "Sol ultra job already active (pid=${pid:-starting}); refusing duplicate" >&2
    exit 3
  fi
  rm "$lock/pid"
  rmdir "$lock"
  mkdir "$lock"
fi
echo $$ > "$lock/pid"
trap 'rm -f "$lock/pid"; rmdir "$lock"' EXIT
pnpm exec tsx bench/sol61-ultra.ts
python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
python3 scripts/verify-sol61-ultra.py
# Publication requires native evidence and manual review of changed test assertions.
python3 scripts/report-sol61-ultra.py
