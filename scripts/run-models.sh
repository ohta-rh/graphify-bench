#!/bin/bash
# Model comparison: Opus 5.5, Sonnet 5 and Sonnet 5.5 at effort low/medium/high/xhigh.
#   scripts/run-models.sh code45|hard|ultra|extreme|apex
# extreme: all 12 arms into results/models/extreme (the earlier extreme run was
# lost to quota stops). code45/hard/ultra: only the four Sonnet 5.5 arms, added to
# the existing results dir with that set's original turn/budget caps, so they sit
# beside the Opus 5.5 / Sonnet 5 runs already there. Runs that end in an
# api_error (quota, transport) are quarantined and retried by bench/matrix.ts.
set -euo pipefail
cd "$(dirname "$0")/.."
SNAP="${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to a corpus-v1 snapshot (corpus/taskflow without docs/)}"
[ -d "$SNAP" ] || { echo "corpus-v1 snapshot not found: $SNAP" >&2; exit 1; }
[ ! -e "$SNAP/docs" ] || { echo "snapshot still contains docs/: $SNAP" >&2; exit 1; }
SONNET55=sonnet55-effort-low,sonnet55-effort-medium,sonnet55-effort-high,sonnet55-effort-xhigh
ALL=opus-effort-low,opus-effort-medium,opus-effort-high,opus-effort-xhigh
ALL=$ALL,effort-low,effort-medium,effort-high,effort-xhigh,$SONNET55
HAIKU55=haiku55-effort-low,haiku55-effort-medium,haiku55-effort-high,haiku55-effort-xhigh
case "${1:?set name}" in
  code45)  OUT=results/opus;           TASKS=tasks/tasks.json,tasks/tasks-ext.json; REPS=1; TURNS=60;  BUDGET=4; ARMS=$SONNET55 ;;
  hard)    OUT=results/hard;           TASKS=tasks/tasks-hard.json;    REPS=2; TURNS=60;  BUDGET=4; ARMS=$SONNET55 ;;
  ultra)   OUT=results/ultra;          TASKS=tasks/tasks-ultra.json;   REPS=2; TURNS=120; BUDGET=8; ARMS=$SONNET55 ;;
  extreme) OUT=results/models/extreme; TASKS=tasks/tasks-extreme.json; REPS=2; TURNS=120; BUDGET=8; ARMS=$ALL ;;
  apex)    OUT=results/models/apex;    TASKS=tasks/tasks-apex.json;    REPS=2; TURNS=160; BUDGET=12; ARMS=$ALL,$HAIKU55 ;;
  *) echo "unknown set: $1" >&2; exit 2 ;;
esac
# BENCH_ARMS overrides the arm list (e.g. to add a newly released model's arms only).
ARMS="${BENCH_ARMS:-$ARMS}"
exec env BENCH_RESULTS_DIR="$OUT" BENCH_MAX_TURNS=$TURNS BENCH_MAX_BUDGET_USD=$BUDGET pnpm bench:full -- \
  --tasks "$TASKS" --conditions "$ARMS" --reps $REPS --concurrency "${BENCH_CONCURRENCY:-6}" --corpus "$SNAP"
