# smoke-output

Artifacts from a **real** harness end-to-end run, kept as a reference for what a
run directory looks like when everything works. Not consumed by any test.

Command (2026-09-02):

```bash
BENCH_MODEL=claude-haiku-4-5 BENCH_EFFORT=medium BENCH_MAX_TURNS=8 BENCH_MAX_BUDGET_USD=0.2 \
  pnpm bench:pilot -- --corpus bench/fixtures/mini-corpus --tasks tasks/tasks.example.json \
  --conditions baseline --only EX1-seat-cap --allow-placeholder
```

Result: `uncached_equivalent` 90,959, `total_cost_usd` $0.0349, 5 turns, F1 1.0.

What it confirms:

- `result.json`, `transcript.jsonl`, `metrics.json` and `grade.json` are all produced.
- The transcript was located by the **encoded-cwd rule**, not the fallback scan
  (`run.meta.json` → `transcript.via == "encoded"`), and the original was deleted.
- The baseline transcript contains **zero** occurrences of "graphify", confirming
  `--setting-sources project` blocks the user-level skill and that the run
  directory name leaks neither the tool name nor the condition.

Paths inside these files point at the throwaway run directory and the user's home;
they are left as-is because they are the evidence for the two points above.
