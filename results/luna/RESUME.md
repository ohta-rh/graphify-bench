# COMPLETE: 500/500 solver and graded runs, 382 correct

Data, README and HTML published; native verification 500/500, four scope audits 0 flagged, all test-change flags reviewed. Light/dark/mobile/pair/shared HTML inspected; repeat publication is byte-identical and non-Luna shared content equals pre-insertion HEAD. Usage interruption was resumed automatically, no reset credits used.

# Luna continuation checkpoint

User explicitly authorized automatic resumption after usage limits on 2026-10-08 (JST). Thread heartbeat automation ID: `luna`, every 15 minutes. Remain quiet if state is unchanged; report quota interruption, actual restart, completion, failure, or needed user action. Stop the heartbeat after full validation and HTML publication.

The active job was confirmed alive at 213/500 solver runs, 177 graded, on 2026-10-08 around 11:10 JST. PID 29911: `bash scripts/run-luna.sh all`; its caffeinate child PID 29913; current hard-set runner parent PID 82159. These PIDs can change: inspect current processes and log before restarting. Native exec session in this chat: 33956. Log: `results/luna/run.log`. Do not duplicate a live runner, including one sleeping for quota reset.

Runner waits for the quota reset timestamp plus 60 seconds, then resumes automatically. It preserves incomplete quota/transport attempts in per-set quarantine. If the job has died and usage is available, resume from the repository root with:

```sh
caffeinate -i env BENCH_CORPUS_V1=/private/tmp/luna-corpus-v1-20261008 BENCH_CONCURRENCY=3 bash scripts/run-luna.sh all >> results/luna/run.log 2>&1
```

The code-only corpus snapshot and scratch root are `/private/tmp/luna-corpus-v1-20261008` and `/private/tmp/luna-scratch-20261008`. **Do not edit frozen measured inputs:** `bench/luna.ts`, `bench/lib/luna-exec.ts`, task files, bug patches, hidden tests, baseline contract, `bench/run.ts`, or `bench/grade.ts`. Each set verifies its manifest hashes on resume. Reporting/verifier changes are safe if necessary.

Matrix: gpt-6-luna low/medium/high/xhigh. code45 45 tasks x 1 repetition = 180; hard 16 x 2 = 128; ultra 12 x 2 = 96; extreme 12 x 2 = 96. 500 total. Native 30-minute CLI wall cap, concurrency 3, fresh clones, no Web/subagents/personal config. Claude turn/budget caps cannot be imposed identically. Do not rerun accuracy failures. Preserve all capped failures. Do not consume account reset credits.

All solver sets execute before the 36 code45 explanation responses are graded by the unchanged serial Claude judge. `scripts/run-luna.sh all` already handles deferred grading, all four scope audits, and final `scripts/report-luna.py --publish`. Partial `python3 scripts/report-luna.py` only updates own progress files. Final publication refuses an incomplete/ungraded matrix.

Validation so far: 331 tests passed, typecheck passed, all four real model/effort smoke probes succeeded, code45 native verification 180/180 and scope audit 0 flags. Partial `python3 scripts/verify-luna.py --partial` validates native events/usage/model/cost/diff inventory. Review newly flagged existing test/config changes and annotate `results/luna/test-change-review.json`; previously reviewed cases are preserved. HIM5 and HIM7 explicitly ask for visible-test updates. Never alter original hidden grades.

Other Claude is benchmarking Haiku 5.5 concurrently. Preserve its results, settings, scripts, and modified files. Initial unrelated modifications: `bench/conditions.ts`, `bench/conditions.test.ts`, `scripts/report-opus/extract.py`. Luna artifacts are under `results/luna`. Final publisher inserts only delimited Luna sections in latest README/shared HTML; never regenerate shared HTML from a stale copy. Model comparisons require full matching task/repetition arms. Report concurrent host load and runtime/cap/date differences; costs are base Standard estimates, not invoices.

After all 500 are graded: run `python3 scripts/verify-luna.py` (without partial), inspect all outstanding test/config diff reviews and all audits, verify final publication/idempotent Luna markers and preservation of other sections. HTML QA helper prepared at `/private/tmp/luna-qa.mjs`: `node /private/tmp/luna-qa.mjs` with Chrome process permission. It writes light/dark/mobile/shared screenshots `/private/tmp/luna-qa-*.png`; inspect each with view_image. Then open `docs/report-luna-ja.html` in Codex and report completion with links to HTML, JSON, CSV, and factual accuracy/time/cost results.

No commit/push or external publication has been requested.

Latest update: usage limit was reached after 410 completed solver cells; 3 interrupted attempts were quarantined. Live runner PID 29911 waited until 2026-10-08 14:58 JST and automatically resumed. Confirmed 411/500 complete and account usage 2% at 15:01 JST. No reset credits consumed. Extreme set running; do not duplicate it.
