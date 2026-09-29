---
name: model-bench
description: Measure a Claude model (new or existing) on graphify-bench's four task sets — code-45, hard, ultra, extreme — against the Opus 5.5 / Sonnet 5 / Sonnet 5.5 arms already measured, then grade, audit for cheating, compare paired per-task, and refresh docs/report-opus-ja.html and the README. Use when a new model or effort level should be benchmarked, or the model comparison re-run. Triggers: "benchmark the new model", "add <model> to the benchmark", "re-run the model comparison", 「新しいモデルでベンチ」「モデル比較して」「<model> もベンチに追加して」「ベンチマーク取り直して」.
---

# Model benchmark on graphify-bench

The four sets differ in difficulty *and* prompt style, which is what separates models. See README → "Hidden-test sets: the design concept" before changing any of them.

| set | results dir | tasks | reps | caps (turns / $) |
|---|---|---|---|---|
| code45 | `results/opus` | `tasks/tasks.json,tasks/tasks-ext.json` | 1 | 60 / 4 |
| hard | `results/hard` | `tasks/tasks-hard.json` | 2 | 60 / 4 |
| ultra | `results/ultra` | `tasks/tasks-ultra.json` | 2 | 120 / 8 |
| extreme | `results/models/extreme` | `tasks/tasks-extreme.json` | 2 | 120 / 8 |

Keep each set's caps: a new arm is only comparable with the arms already in its directory when it ran under the same caps.

## 1. Add the model as arms

1. Confirm the exact model id works and is what the CLI actually runs: `claude -p "Reply ok." --model <id> --effort low --output-format json --max-turns 1 --no-session-persistence` and read `modelUsage` keys. Aliases move (`sonnet` began resolving to Sonnet 5.5 on release), so always pin the full id.
2. In `bench/conditions.ts` add a model constant and one arm per effort (`low`, `medium`, `high`, `xhigh`), each `overlays: ["baseline"]`, `corpus: "v1"`, only `model` and `effort` set — copy the `sonnet55-effort-*` entries. Extend the "only the model swapped" test in `bench/conditions.test.ts` and the arm list in `scripts/report-opus/extract.py`.
3. `pnpm exec vitest run` and `pnpm exec tsc --noEmit` must both pass.

## 2. Run

- Needs a corpus-v1 snapshot: `cp -cR corpus/taskflow <scratch>/corpus-v1 && rm -r <scratch>/corpus-v1/docs`, passed as `BENCH_CORPUS_V1`.
- `BENCH_ARMS=<comma-separated new arms> BENCH_CONCURRENCY=6 scripts/run-models.sh <set>` for each set, as a background process with a log file. Without `BENCH_ARMS` the script runs its built-in arm list (see the file). The matrix skips cells that are already complete, so an interrupted run is resumed by running the same command again.
- Account quota stops are handled: a run ending `is_error` with `terminal_reason: "api_error"` is moved to `<results>/quarantine/`, every worker pauses until the reset named in the message, and the cell is retried. `error_max_turns` is a real outcome and stays.
- There is no dry-run flag in `run-models.sh`; to count cells, call `pnpm bench:full -- ... --dry-run` directly.
- Measured cost per arm at list price: code45 $7–17, hard $5–31, ultra $7–53, extreme $9–69 (the cheap end is Sonnet 5.5 low, the top is Opus 5.5 xhigh).

## 3. Grade, audit, compare

```bash
ls <results>/runs | grep <new-arm-prefix> | BENCH_RESULTS_DIR=<results> xargs pnpm -s bench:grade -- --tasks <tasks>
python3 scripts/audit-scope.py <results>/runs          # exit 1 = a run to inspect
python3 scripts/report-opus/extract.py <results> > <scratch>/f-<set>.json
pnpm -s bench:analyze:<opus|hard|ultra|extreme> && pnpm -s bench:report:<...>   # per-set REPORT.md
```

- code45 uses the Haiku judge for `explain` tasks and grades serially (~40 min for 180 runs); the others grade from the hidden-test result in seconds.
- Inspect every audit flag before calling it a violation. False positives seen so far: the agent's own `/tmp` files, its own persisted tool output under `~/.claude/projects/<its session>/tool-results/` (also via `*` globs), and a mistyped copy of its own clone path.
- Base every conclusion on the paired per-task differences with bootstrap CIs from `extract.py` (`pairs`), not on medians alone.

## 4. Report and publish

- `python3 scripts/report-opus/build_html.py docs/report-opus-ja.html <scratch>` (expects `f-code45.json`, `f-hard.json`, `f-ultra.json`, `f-extreme.json`). The page opens with a summary and a clearly separated interpretation; update the prose in `build_html.py` to what the new numbers show — check every claim against the JSON.
- Render it (headless Chrome screenshot in light and dark mode, and at a narrow width) and read the images before publishing.
- Update the README model-comparison section in English. Commit on `main` by explicit path (`results/...`, `docs/...`, `scripts/...`) and push.

## Lessons that cost a re-run

- A quota stop once looked like success (`subtype: "success"`), and 168 of 192 runs were empty. Check `terminal_reason` before believing a set.
- A hidden test that read the real clock failed about 1 in 3 full-suite runs. Pin the clock in hidden tests (`vi.useFakeTimers()` + `setSystemTime`).
- Never keep or drop a task because of how a model scored on it.
- Detailed specs hide the discovery gap between models, and symptom-only prompts expose it. Keep both kinds of set.
- Old and new arms in the same directory can differ in CLI version and concurrency. Say so in the report; the extreme set is the one measured all at once.
