# Validation — EIM6-workspace-deletion

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`). Git could not be run outside the author's worktree in this
session, so the patch (git format: `diff --git a/… b/…`) was applied with `patch -p1`
(dry-run first).

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/EIM6-workspace-deletion.test.ts`: `pnpm exec vitest run tests/hidden/EIM6-workspace-deletion.test.ts`
3. fresh pristine clone + `patch -p1 --dry-run < solution.patch` + `patch -p1 < solution.patch` + hidden test: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. three naive implementations + hidden test: `pnpm exec tsc --noEmit`; `pnpm exec vitest run tests/hidden/EIM6-workspace-deletion.test.ts`
5. the hidden test 3x on the solved clone.

Naive attempts (step 4), each derived from the reference solution:
- A, the obvious partial: delete/restore API, events, audit, permission, invitation refusal and fan-out skip; the five jobs left untouched (no skipping, no purge).
- B, careful and near-complete (the trap): everything, but "jobs skip deleted workspaces" is implemented once, by filtering archived organizations out of the shared usage-driven work list, and the purge walks that same list with an expiry check. Trial-expiry and webhook-delivery keep their own checks.
- C, everything, except the purge forgets the two rows without an `org_id` column of their own concern — the usage counter row and the sessions pinned to the workspace — and `restoreOrganization` does not enforce the window (any deleted workspace can be restored until the purge runs).

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0     Test Files 73 passed   Tests 617 passed
step2 pristine + hidden
  hidden exit=1    Tests 14 failed | 1 passed (15)
                   (restoreOrganization is not a function; deletion event/audit missing; jobs run;
                    the sign-in/slug-reserved case passes on pristine because those reads already
                    filter archived rows)
step3 fresh clone + solution.patch + hidden
  patch dry-run exit=0 / patch exit=0 (17 files, 269 changed lines)
  tsc exit=0
  full suite exit=0  Test Files 74 passed   Tests 632 passed (617 + 15)
step4 naive A   tsc 0, hidden exit=1  Tests 6 failed | 9 passed
     × keeps the overdue sweep away from a deleted workspace until it is restored
     × freezes the usage counters of a deleted workspace
     × leaves a deleted workspace's expired trial alone until it is restored
     × fails a deleted workspace's webhook deliveries instead of sending them
     × keeps every row of a deleted workspace intact until the purge
     × purges every trace of a workspace once the window has closed
step4 naive B   tsc 0, hidden exit=1  Tests 1 failed | 14 passed
     × purges every trace of a workspace once the window has closed
step4 naive C   tsc 0, hidden exit=1  Tests 2 failed | 13 passed
     × treats the workspace as gone once the window has closed, even before the purge
     × purges every trace of a workspace once the window has closed
step5 determinism   run1/run2/run3: Tests 15 passed (15)
```

Determinism: every case runs under `vi.useFakeTimers({ toFake: ["Date"] })` pinned to
2026-03-01T09:00Z, moves the clock explicitly, and hands the jobs an explicit `now`; the two
cases that depend on the oldest-measured-first job list create their tenants a day earlier so
they are guaranteed to be inside the batch. No assertion sits on the exact window boundary
(29d/30d-1h vs 30d+1h). No visible test encoded the old policy, so `solution.patch` changes no
visible test.
