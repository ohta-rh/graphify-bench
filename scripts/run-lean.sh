#!/bin/bash
# Phase 12 measurement launcher. Kept as a file rather than a shell one-liner so
# the exact invocation that produced results/lean is recoverable from the repo.
set -euo pipefail
cd "$(dirname "$0")/.."
# The docs-free corpus-v1 snapshot Phase 9-11 also measured against; it lives
# outside the repository because `corpus/taskflow` is now corpus-v2.
SNAP="${BENCH_CORPUS_V1:-/private/tmp/claude-501/-Users-tetsuyaohta-projects-other-graphify-bench/a179592b-4abf-4d72-b7f7-8e1ec112b098/scratchpad/corpus-v1}"
[ -d "$SNAP" ] || { echo "corpus-v1 snapshot not found: $SNAP" >&2; exit 1; }
exec env BENCH_RESULTS_DIR=results/lean pnpm bench:full -- \
  --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions lean-tools,few-turns,haiku-nosub,all-in \
  --reps 1 --concurrency 3 --corpus "$SNAP"
