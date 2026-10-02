#!/bin/bash
# GPT-6.1 Sol code-45 (135 cells) or extreme (72 cells).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to a corpus-v1 snapshot without docs/}"
export BENCH_SET="${1:-code45}"
case "$BENCH_SET" in
  code45) DEFAULT_OUT=results/sol61; REPORT=scripts/report-sol61.py ;;
  extreme) DEFAULT_OUT=results/sol61-extreme; REPORT=scripts/report-sol61-extreme.py ;;
  *) echo "unknown set: $BENCH_SET" >&2; exit 2 ;;
esac
export BENCH_RESULTS_DIR="${BENCH_RESULTS_DIR:-$DEFAULT_OUT}"
export BENCH_CONCURRENCY="${BENCH_CONCURRENCY:-3}"
pnpm exec tsx bench/sol61.ts
python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
python3 "$REPORT" "$BENCH_RESULTS_DIR"
