# AIM2-billing-periods — validation

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR "$SNAP" <clone>`), driven by `scratchpad/apex-work/tools/validate.py`. Git is not
available to this session outside its own worktree, so the patch (unified diff with `a/` `b/`
prefixes, `/dev/null` for new files) was applied with `patch -p1 --dry-run` followed by
`patch -p1`; it applies with `git apply -p1` the same way.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` | exit 0; 73 files, 617/617 pass |
| 2 | pristine + `tests/hidden/AIM2-billing-periods.test.ts`: `pnpm exec vitest run tests/hidden/AIM2-billing-periods.test.ts` | exit 1 — the file cannot load (`@/server/jobs/billing-renewal-job` missing), every case unavailable |
| 3 | fresh clone + `patch -p1 -i solution.patch` | applied cleanly (19 files) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 22/22 pass |
| 3 | `pnpm exec vitest run` (hidden included) | 74 files, 639/639 pass |
| 5 | hidden test x3, full suite x2 on the solved clone | 22/22, 22/22, 22/22; 639/639, 639/639 |

## Partial attempts (step 4), each derived from the reference solution

| Attempt | Hidden result |
|---|---|
| B: one renewal per run (missed periods are not caught up) | 3/22 fail (`catches up one period per missed interval…`, `clamps a month-end start…`, `numbers invoices uniquely…`) |
| C: proration on seat changes only; a plan upgrade charges nothing mid-period | 2/22 fail (`charges the price difference for an upgrade…`, `applies the same rule to a seat change and a plan change…`) |
| D: month arithmetic through `Date.setUTCMonth` overflow (31 January + 1 month = 3 March) | 2/22 fail (`clamps a month-end start…`, `turns a 29 February start into 28 February…`) |
| E: days left floored instead of counting a started day | 2/22 fail (`charges added seats for the rest of the period…`, `applies the same rule to a seat change and a plan change…`) |
| F: leaving the free plan keeps the running period | 1/22 fail (`starts a fresh, fully invoiced period when a workspace leaves the free plan`) |

Reference solution: 19 files, 505 changed lines across lib, types, schemas, drizzle schema, jobs, a cron route, repositories, services and the UI label records.
