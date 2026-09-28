#!/bin/bash
# Ultra-hard set: 12 hidden-test tasks x 8 arms (Opus 5.5 / Sonnet 5 at effort
# low..xhigh) x 2 reps. Caps are raised to 120 turns / $8 for this set only, so
# a miss is not merely the 60-turn cap from the other sets; run.meta.json records
# the caps that actually applied.
set -euo pipefail
cd "$(dirname "$0")/.."
SNAP="${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to a corpus-v1 snapshot (corpus/taskflow without docs/)}"
[ -d "$SNAP" ] || { echo "corpus-v1 snapshot not found: $SNAP" >&2; exit 1; }
[ ! -e "$SNAP/docs" ] || { echo "snapshot still contains docs/: $SNAP" >&2; exit 1; }
exec env BENCH_RESULTS_DIR=results/ultra BENCH_MAX_TURNS=120 BENCH_MAX_BUDGET_USD=8 pnpm bench:full -- \
  --tasks tasks/tasks-ultra.json \
  --conditions opus-effort-low,opus-effort-medium,opus-effort-high,opus-effort-xhigh,effort-low,effort-medium,effort-high,effort-xhigh \
  --reps 2 --concurrency 3 --corpus "$SNAP"
