#!/bin/bash
# Independent Luna artifacts; never uses Claude's shared results directories.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to the frozen code-only snapshot}"
export BENCH_CONCURRENCY="${BENCH_CONCURRENCY:-3}"
export BENCH_SCRATCH="${BENCH_SCRATCH:-/private/tmp/luna-scratch-20261008}"
export LUNA_DEFER_JUDGE=1
export TZ=Asia/Tokyo
case "${1:-all}" in
  all) SETS=(code45 hard ultra extreme) ;;
  code45|hard|ultra|extreme) SETS=("$1") ;;
  *) echo "unknown set: $1" >&2; exit 2 ;;
esac
for bench_set in "${SETS[@]}"; do
  export BENCH_SET="$bench_set"
  export BENCH_RESULTS_DIR="results/luna/$bench_set"
  pnpm exec tsx bench/luna.ts
  python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
done
if [[ " ${SETS[*]} " == *" code45 "* ]]; then
  BENCH_RESULTS_DIR=results/luna/code45 pnpm exec tsx bench/luna-grade.ts
fi
python3 scripts/report-luna.py --publish
