# AIM1-milestones — validation

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR "$SNAP" <clone>`), driven by `scratchpad/apex-work/tools/validate.py`. Git is not
available to this session outside its own worktree, so the patch (unified diff with `a/` `b/`
prefixes, `/dev/null` for new files) was applied with `patch -p1 --dry-run` followed by
`patch -p1`; it applies with `git apply -p1` the same way.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` | exit 0; 73 files, 617/617 pass |
| 2 | pristine + `tests/hidden/AIM1-milestones.test.ts`: `pnpm exec vitest run tests/hidden/AIM1-milestones.test.ts` | exit 1 — the file cannot load (`@/lib/milestones`, `@/server/services/milestone-service` missing), every case unavailable |
| 3 | fresh clone + `patch -p1 -i solution.patch` | applied cleanly (32 source files + 4 visible fixtures) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 21/21 pass |
| 3 | `pnpm exec vitest run` (hidden included) | 74 files, 638/638 pass |
| 5 | hidden test x3, full suite x2 on the solved clone | 21/21, 21/21, 21/21; 638/638, 638/638 |

## Partial attempts (step 4), each derived from the reference solution

| Attempt | Hidden result |
|---|---|
| B: progress read off one page (100) of the project's issues | 2/21 fail (`counts progress over every live issue…`, `moves every open issue, however many`) |
| C: the open-milestone-of-this-project gate in `setIssueMilestone` only; creation stores whatever it is given | 1/21 fail (`applies the same gate when the milestone is given at creation, creating nothing otherwise`) |
| D: closing moves every live issue of the milestone, finished ones included | 3/21 fail (`moves only the open live issues…`, `tells each assignee of a moved issue once…`, `closes an empty milestone, moving nothing and alerting nobody`) |
| E: no state check on close and reopen | 1/21 fail (`refuses to close twice or reopen an open milestone, and reopens a closed one`) |
| F: overdue at the target instant itself (`<=`) | 1/21 fail (`is overdue only when open, strictly past its target and still holding open work`) |

Reference solution: 32 source files + 4 visible test fixtures (the issue literals gain `milestoneId: null`), 821 changed lines.
