#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Hold assertions for this job only. Do not change persistent macOS settings.
if [[ "${1:-}" != --awake ]]; then
  exec /usr/bin/caffeinate -i -s /bin/bash "$0" --awake
fi
export TERRA61_RECOVERY_POWER_GUARD=1
export BENCH_CORPUS_V1=/private/tmp/terra61-corpus-v1-20261027
export BENCH_CONCURRENCY=3
export BENCH_SCRATCH=/private/tmp/bench-scratch
export TZ=Asia/Tokyo
state=results/terra61-recovery
mkdir -p "$state"
lock="$state/.run-lock"
if ! mkdir "$lock" 2>/dev/null; then
  pid=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ -z "$pid" ]] || kill -0 "$pid" 2>/dev/null; then
    echo "Recovery already active (pid=${pid:-starting}); refusing duplicate" >&2
    exit 3
  fi
  rm "$lock/pid"
  rmdir "$lock"
  mkdir "$lock"
fi
echo $$ > "$lock/pid"
trap 'rm -f "$lock/pid"; rmdir "$lock"' EXIT
python3 scripts/check-terra61-recovery-inputs.py
for set in hard ultra apex; do
  export BENCH_SET="$set"
  export BENCH_RESULTS_DIR="$state/$set"
  python3 scripts/check-terra61-recovery-inputs.py
  pnpm exec tsx bench/terra61-recovery.ts
  python3 scripts/audit-scope.py "$BENCH_RESULTS_DIR/runs" > "$BENCH_RESULTS_DIR/audit.txt" 2>&1
done
python3 scripts/verify-terra61-recovery.py
