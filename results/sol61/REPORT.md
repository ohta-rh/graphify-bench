# GPT-6.1 Sol: code-45, low / medium / high

135 runs, 45 unchanged code tasks × 3 reasoning efforts × 1 repetition. Measured on 2026-09-30〜2026-10-01 (Asia/Tokyo) with codex-cli 0.159.0, concurrency 3. Total standard list-price equivalent: $8.6251. Grading uses the existing set-F1 thresholds, Vitest specs, and blind Haiku explanation judge.

| effort | correct | accuracy | cost median | total cost | cost/correct | wall median | input tokens median |
|---|---:|---:|---:|---:|---:|---:|---:|
| low | 38/45 | 84.4% | $0.0425 | $2.5434 | $0.0669 | 24.2 s | 58,846 |
| medium | 39/45 | 86.7% | $0.0417 | $2.8415 | $0.0729 | 30.3 s | 74,085 |
| high | 39/45 | 86.7% | $0.0554 | $3.2403 | $0.0831 | 36.7 s | 80,122 |

| category | low | medium | high |
|---|---:|---:|---:|
| explain | 9/9 | 9/9 | 9/9 |
| fix | 9/9 | 9/9 | 9/9 |
| impact | 5/9 | 6/9 | 5/9 |
| locate | 6/9 | 6/9 | 7/9 |
| reference | 9/9 | 9/9 | 9/9 |

Claude reference comparison, matched low/medium/high cells only (45 × 3 = 135 per model; xhigh excluded). The CLI/tool/date/limit differences still apply. These are descriptive totals; effort-specific paired CIs follow below.

| model | correct | accuracy | cost median | cost/correct | wall median |
|---|---:|---:|---:|---:|---:|
| GPT-6.1 Sol | 116/135 | 85.9% | $0.0433 | $0.0744 | 31.3 s |
| Opus 5.5 | 115/135 | 85.2% | $0.1619 | $0.2460 | 20.9 s |
| Sonnet 5 | 108/135 | 80.0% | $0.1778 | $0.2789 | 43.5 s |
| Sonnet 5.5 | 118/135 | 87.4% | $0.0759 | $0.1108 | 39.3 s |

Paired mean differences over the same 45 tasks; percentile 95% bootstrap CIs, 10,000 resamples, seed 7. Positive accuracy means the first arm is better; negative cost/time means it is cheaper/faster. CIs crossing zero do not establish a difference. Claude comparisons include the runtime change and are contextual comparisons, not isolated model effects.

| comparison | accuracy difference [95% CI] | cost difference [95% CI] | wall difference [95% CI] |
|---|---:|---:|---:|
| sol61-effort-high − sol61-effort-medium | +0.0 pt [-6.7, +6.7] | $+0.0089 [+0.0014, +0.0165] | +14.0 s [+6.6, +22.1] |
| sol61-effort-high − sol61-effort-low | +2.2 pt [+0.0, +6.7] | $+0.0155 [+0.0059, +0.0253] | +19.0 s [+11.8, +26.9] |
| sol61-effort-medium − sol61-effort-low | +2.2 pt [+0.0, +6.7] | $+0.0066 [-0.0017, +0.0144] | +5.0 s [+0.7, +9.1] |
| sol61-effort-low − opus-effort-low | +0.0 pt [-6.7, +6.7] | $-0.1063 [-0.1191, -0.0947] | +16.2 s [+8.4, +24.8] |
| sol61-effort-low − effort-low | +6.7 pt [-4.4, +17.8] | $-0.1253 [-0.1502, -0.1038] | -6.5 s [-14.5, +0.9] |
| sol61-effort-low − sonnet55-effort-low | -2.2 pt [-6.7, +0.0] | $-0.0256 [-0.0311, -0.0200] | +1.4 s [-8.6, +12.2] |
| sol61-effort-medium − opus-effort-medium | +2.2 pt [-4.4, +8.9] | $-0.1514 [-0.1773, -0.1289] | +17.3 s [+10.2, +25.1] |
| sol61-effort-medium − effort-medium | +6.7 pt [-2.2, +15.6] | $-0.1546 [-0.1799, -0.1302] | -14.0 s [-21.9, -6.4] |
| sol61-effort-medium − sonnet55-effort-medium | -2.2 pt [-6.7, +0.0] | $-0.0291 [-0.0360, -0.0224] | +3.3 s [-6.0, +13.2] |
| sol61-effort-high − opus-effort-high | +0.0 pt [-6.7, +6.7] | $-0.1794 [-0.2135, -0.1488] | +28.6 s [+19.1, +39.5] |
| sol61-effort-high − effort-high | +4.4 pt [+0.0, +11.1] | $-0.1978 [-0.2460, -0.1532] | -23.2 s [-38.3, -10.0] |
| sol61-effort-high − sonnet55-effort-high | +0.0 pt [-6.7, +6.7] | $-0.0442 [-0.0569, -0.0333] | +12.2 s [-0.3, +25.7] |

Measurement details and limits:

- Fresh code-only corpus-v1 clone per cell, the baseline answer contract copied byte-for-byte to AGENTS.md and CLAUDE.md; task prompts, injected fix bugs, answer keys and scoring thresholds are unchanged. Stable shuffled task/effort order. No index.
- Codex native shell/edit tools, workspace-write sandbox, personal config ignored, web search disabled, multi-agent tools disabled. Claude arms use Claude Code with different tools, system prompts and delegation behavior; their dates and concurrency also differ.
- Native input_tokens already includes cached input and cache writes. Uncached input = input − cached − writes. All output tokens include reasoning; reasoning tokens are not added again. Cache writes are billed separately when reported. `uncached_equivalent_all` means total input volume, not the uncached-only portion. Unknown model/API turn count remains null, not 1.
- Cost is calculated from [the official model pricing](https://developers.openai.com/api/docs/models/gpt-6.1-sol): $2/M uncached input, $0.10/M cached input, $2.50/M cache writes, $10/M output, standard service. It is a list-price estimate, not a subscription invoice. Judge charges are in grade.json and excluded from solver costs, matching the existing benchmark.
- Codex exec JSONL does not expose incremental per-request token usage or the original Claude CLI caps. These runs have a 30-minute wall cap, with no enforced 60-model-turn/$4 cap. This is a limit difference for Claude comparisons. Inspect unusually long/expensive runs in runs.csv.
- Each effort has only one run per task; near-equal accuracy at n=45 can reflect noise. This addition measures code-45 only; it supports no claims about hard, ultra, extreme, or index effectiveness.
- The account quota interrupted execution after 89 graded cells on September 30. The remaining 46 cells resumed on October 1, preserving every completed outcome. Efforts were interleaved within each session; date/cache effects are not separately controlled. 13 infrastructure attempts are kept in quarantine and excluded from the 135 valid measurements. Raw native events.jsonl, normalized transcript.jsonl for the existing scope audit, actual changes.patch for fix tasks, result.json, run.meta.json, metrics.json and grade.json are retained.

Reproduce with `scripts/run-sol61.sh`; machine-readable data: analysis.json and runs.csv. Japanese report: ../../docs/report-sol61-ja.html, with an addition in ../../docs/report-opus-ja.html.
