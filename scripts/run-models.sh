#!/bin/bash
# Model comparison, re-measured end to end on one CLI build: Opus 5.5, Sonnet 5
# and Sonnet 5.5, each at effort low/medium/high/xhigh, on one task set per call.
#   scripts/run-models.sh code45|hard|ultra|extreme
# Results land in results/models/<set>/. Runs that end in an api_error (quota,
# transport) are quarantined and retried after the reset by bench/matrix.ts.
set -euo pipefail
cd "$(dirname "$0")/.."
SNAP="${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to a corpus-v1 snapshot (corpus/taskflow without docs/)}"
[ -d "$SNAP" ] || { echo "corpus-v1 snapshot not found: $SNAP" >&2; exit 1; }
[ ! -e "$SNAP/docs" ] || { echo "snapshot still contains docs/: $SNAP" >&2; exit 1; }
ARMS=opus-effort-low,opus-effort-medium,opus-effort-high,opus-effort-xhigh
ARMS=$ARMS,effort-low,effort-medium,effort-high,effort-xhigh
ARMS=$ARMS,sonnet55-effort-low,sonnet55-effort-medium,sonnet55-effort-high,sonnet55-effort-xhigh
case "${1:?set name}" in
  code45)  TASKS=tasks/tasks.json,tasks/tasks-ext.json; REPS=1; TURNS=60;  BUDGET=4; ARMS=$ARMS,effort-low-nosub ;;
  hard)    TASKS=tasks/tasks-hard.json;    REPS=2; TURNS=120; BUDGET=8; ARMS=$ARMS,effort-low-nosub ;;
  ultra)   TASKS=tasks/tasks-ultra.json;   REPS=2; TURNS=120; BUDGET=8 ;;
  extreme) TASKS=tasks/tasks-extreme.json; REPS=2; TURNS=120; BUDGET=8 ;;
  *) echo "unknown set: $1" >&2; exit 2 ;;
esac
exec env BENCH_RESULTS_DIR="results/models/$1" BENCH_MAX_TURNS=$TURNS BENCH_MAX_BUDGET_USD=$BUDGET pnpm bench:full -- \
  --tasks "$TASKS" --conditions "$ARMS" --reps $REPS --concurrency "${BENCH_CONCURRENCY:-6}" --corpus "$SNAP"
