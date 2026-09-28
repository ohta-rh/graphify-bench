# Validation — UIM4-workspace-time-zone

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by the author's `validate.sh`.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/UIM4-workspace-time-zone.test.ts`: `pnpm exec vitest run tests/hidden/UIM4-workspace-time-zone.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden test included)
4. two naive implementations + hidden: `pnpm exec vitest run tests/hidden/UIM4-workspace-time-zone.test.ts`
5. the hidden test 3x on the solved clone.

The patch is git-format (`diff --git a/… b/…`, `/dev/null` for new files) and was applied with `patch -p1`.
Git could not be run outside the author's worktree in this session.

Naive attempts (step 4):
- A, the obvious call sites only: the setting (type, column, mapper, repository, schema, validation), the new helpers, a zone-aware `isOverdue`, and the overdue sweep cut at local midnight. The project counter, digest job, feed grouping and retention sweep were left untouched.
- B, every call site made zone-aware, but the existing rules were ignored: the project counter still counts done/canceled issues, `digestWindow` starts 24h before its end, and the retention cut-off is local midnight minus `retentionDays × 24h`.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0
     Test Files  73 passed (73)
          Tests  617 passed (617)
step2 pristine + hidden
  hidden exit=1
          Tests  14 failed (14)   (every case fails: missing helpers/setting, instant-based overdue, UTC digest)
step3 pristine + solution + hidden
  patch dry-run exit=0
  patch exit=0
  tsc exit=0
  full suite exit=0
     Test Files  74 passed (74)
          Tests  631 passed (631)
step4 naive A
  hidden exit=1
         × counts a project's overdue issues by the same rule on the project page
         × gives the project list the same overdue counter as the project page
         × schedules the digest on the workspace clock
         × mails the local window and leaves later notifications for the next digest
         × covers a 23-hour window on the day the clocks spring forward
         × groups the activity feed by local calendar day
         × cuts retention at local midnight, whole calendar days back
         × counts retention in calendar days across a DST change
          Tests  8 failed | 6 passed (14)
  (tsc exit=2 in this clone only because the hidden test calls groupByDay with a zone argument)
step4 naive B
  tsc exit=0
  hidden exit=1
         × counts a project's overdue issues by the same rule on the project page
         × gives the project list the same overdue counter as the project page
         × computes the digest window between two local digest hours
         × covers a 23-hour window on the day the clocks spring forward
         × counts retention in calendar days across a DST change
          Tests  5 failed | 9 passed (14)
step5 determinism
  run1 exit=0   Tests  14 passed (14)
  run2 exit=0   Tests  14 passed (14)
  run3 exit=0   Tests  14 passed (14)
```

Determinism: every instant is fixed (`new Date("…Z")` or `vi.setSystemTime`). Assertions filter
job output by issue id / recipient address, so they are independent of the other tenants in the file.
No assertion sits exactly on a day or window boundary.
