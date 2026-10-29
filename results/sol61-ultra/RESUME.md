# GPT-6.1 Sol ultra checkpoint

Status: COMPLETE — 96/96 measured, graded and verified; 87 correct. Data/HTML/README delivered. Rendered visual QA remains unverified due to the existing browser file:// policy. Requested 2026-10-09 Asia/Tokyo.

- Exact model: `gpt-6.1-sol`.
- Ultra: unchanged `tasks/tasks-ultra.json`, 12 tasks × 2 repetitions × low/medium/high/xhigh = 96 runs.
- Native Codex exec, baseline contract, code-only corpus-v1, concurrency 3, 30-minute wall cap per cell; no Web, personal settings or multi-agent tools.
- Frozen snapshot: `/private/tmp/sol61-ultra-corpus-v1-20261009`.
- Command: `bash scripts/run-sol61-ultra.sh`; log `results/sol61-ultra/run.log`.
- `.run-lock/pid` prevents duplicate jobs. Check the actual PID/process before restarting. A live job waiting on quota already resumes itself.
- Stopped jobs may resume only missing cells. Completed accuracy failures and wall timeouts remain scored; only incomplete transport/quota attempts are quarantined and retried.
- Native evidence and frozen source hashes are stored in `experiment.json`. Do not modify measured runner, adapter, grader, tasks or corpus after launch.
- All 12 tasks are Vitest graded; no explanation judge is needed.
- Read current shared README/HTML at publication, preserve all non-Sol-ultra sections and other models' raw data.

Final work:

1. Finish all 96 cells, then `python3 scripts/audit-scope.py results/sol61-ultra/runs` and inspect flags. Save full output as `audit.txt`.
2. `python3 scripts/verify-sol61-ultra.py` (or `--partial` during execution). Read each flagged existing visible-test/config diff. Add factual `review` strings in `test-change-review.json`; preserve original scores and disclose issues with `REVIEW_ISSUE:` prefix where needed. Run verifier again.
3. `python3 scripts/report-sol61-ultra.py` generates final JSON/CSV/Markdown. `--partial` generates progress JSON only.
4. `python3 scripts/report-sol61-ultra.py --publish` requires complete native evidence and reviewed edits, creates `docs/report-sol61-ultra-ja.html` and delimited Sol ultra additions to shared README/HTML. Complete matched reference arms only, task bootstrap over 12 tasks after averaging 2 repeats.
5. Check light/dark/mobile HTML layout using permitted tools. CUA file:// was previously rejected; do not bypass through CDP or another browser route.
6. Report measured accuracy/speed/base-rate cost, link HTML and data; update this checkpoint COMPLETE and PAUSE heartbeat `sol`.

Heartbeat `sol` runs every 15 minutes in this chat. Stay quiet on unchanged running/quota-wait status; notify actual quota, resumption, completion or actionable failure only. Prior user authorization permits auto-resume after limit reset; never spend reset credits.

Launch evidence: codex-cli 0.159.0, Node v25.5.0. All 4 exact-model effort probes completed. Vitest 340/340 passed; TypeScript check passed.

Latest checked progress is in progress.json / PROGRESS.md; 11 verified cells at 2026-10-09 14:07 JST, all passed. All 3 solver workers were live on xhigh tasks; no actual quota event yet. Native session 84987 remains running; bash lock PID 52257. Do not infer a quota from long tasks.

Heartbeat 2026-10-09 14:12 JST: existing bash PID 52257 and solver workers alive; no duplicate launch. 21 graded/verified, 19 passed; native/scope evidence clean, visible test edits reviewed through UIM6 xhigh r2. Usage 71% (5h), 36% weekly, ordinary usage allowed, no quota event. UIM6 xhigh r2 strict failure: purge storage counter 0.49999237060546875 vs expected 1, retained. Continue running; no user notification for ordinary progress.

Heartbeat 2026-10-09 18:57 JST: actual usage-limit messages recorded for 3 incomplete cells, paused until 18:55 JST, then existing PID 52257 automatically resumed attempt 2. No duplicate process, no reset credits (all 3 remain available). Usage now 9% 5h / 42% weekly, ordinary usage allowed. Checked 33 graded/native-verified, 28 passed, scope audit 0 flags. Visible edits reviewed through UIM4 medium r1/r2. Resume notification sent. Continue existing job; refresh progress on subsequent meaningful state changes.

Heartbeat 2026-10-09 19:12 JST: existing bash PID 52257 alive, 3 solver workers active, no duplicate launch. 43 graded/verified, 38 passed, scope 0 flags. Visible edits reviewed through UIM4 high r1 and low r2. Usage 47% 5h / 48% weekly, ordinary usage allowed. No new quota since prior resumption; keep ordinary progress silent.

Heartbeat 2026-10-09 19:27 JST: existing bash PID 52257 alive, workers continuing, no duplicate launch. 55 graded/verified, 49 passed, scope audit 0 flags. Visible edits reviewed through UIM4 xhigh r2. Usage 84% 5h / 54% weekly, ordinary usage still allowed; no new quota notification yet. All 3 reset credits remain untouched.

Heartbeat 2026-10-09 23:57 JST: second actual quota event quarantined 3 incomplete cells (6 total infrastructure attempts), existing PID 52257 resumed automatically at 23:56 JST. No duplicate launch; all reset credits untouched. Usage 7% 5h / 57% weekly, ordinary usage allowed. Checked 61 graded/verified, 55 passed, scope 0 flags. UIM4 low r1 visible changes reviewed. Second-resumption notification sent. Continue existing job.

Heartbeat 2026-10-10 00:12 JST: existing bash PID 52257 and 3 solver workers alive; no duplicate launch. 74 graded/native-verified, 68 passed, scope audit 0 flags. UIM5 medium r1 visible test extension reviewed. Usage 43% 5h / 63% weekly, ordinary usage allowed; no quota since 23:56 restart, no reset credits used. Continue existing job, ordinary progress silent.

Heartbeat 2026-10-10 00:27 JST: existing bash PID 52257 and 3 workers alive; no duplicate launch. 85 graded/native-verified, 78 passed, scope audit 0 flags. Visible edits reviewed through UIM4 high r2. Usage 79% 5h / 69% weekly, ordinary usage allowed; no new quota event. Continue existing job and keep ordinary progress silent.

Finalized 2026-10-10 05:05 JST: low 20/24, medium 21/24, high 23/24, xhigh 23/24. Base-rate completed-solver estimate $21.2703648. Three quota windows recovered automatically; 9 incomplete attempts quarantined, no accuracy retries, no reset credits. Final scope audit 0 flags, native verification 96/96, all existing visible edits reviewed. Generated analysis.json, runs.csv, REPORT.md, docs/report-sol61-ultra-ja.html, delimited README/shared HTML additions. 1,920 reference raw artifacts unchanged; shared contents outside the new section byte-identical to pre-publication snapshots. html-verification.json records structural/data/link checks and honest lack of light/dark/mobile browser rendering. Do not restart measurements; heartbeat sol should be PAUSED after delivery.
