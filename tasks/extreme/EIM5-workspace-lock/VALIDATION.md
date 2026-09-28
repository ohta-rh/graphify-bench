# Validation — EIM5-workspace-lock

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`). Git could not be run outside the author's worktree in this
session, so the patch (git format: `diff --git a/… b/…`, `/dev/null` for the new file) was
applied with `patch -p1` (dry-run first).

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/EIM5-workspace-lock.test.ts`: `pnpm exec vitest run tests/hidden/EIM5-workspace-lock.test.ts`
3. fresh pristine clone + `patch -p1 --dry-run < solution.patch` + `patch -p1 < solution.patch` + hidden test: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. three naive implementations + hidden test: `pnpm exec tsc --noEmit`; `pnpm exec vitest run tests/hidden/EIM5-workspace-lock.test.ts`
5. the hidden test 3x on the solved clone.

Naive attempts (step 4), each derived from the reference solution:
- A, the obvious partial: the lock rule and error mapping, guards on the "content" services only (issues, comments, projects, labels, attachments); members, invitations, settings, flags and webhooks left unguarded.
- B, careful and near-complete (the trap): every one of the 34 guards in place, but the lock is keyed on the subscription status — `canceled` means locked now — so a cancellation scheduled for the end of the paid period locks the workspace immediately.
- C, every guard in place with the correct rule, but placed "fail fast" right after the tenant-scope check in the issue and comment services, and before the token checks in `acceptInvitation`.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0     Test Files 73 passed   Tests 617 passed
step2 pristine + hidden
  hidden exit=1    Test Files 1 failed — Error: Failed to resolve import "@/lib/billing-lock"
                   (the file cannot load on pristine; every case is unavailable)
step3 fresh clone + solution.patch + hidden
  patch dry-run exit=0 / patch exit=0 (15 files, 135 changed lines)
  tsc exit=0
  full suite exit=0  Test Files 74 passed   Tests 632 passed (617 + 15)
step4 naive A   tsc 0, hidden exit=1  Tests 2 failed | 13 passed
     × refuses membership changes and invitations while keeping them readable
     × refuses settings, flag and webhook writes but still allows deleting the workspace
step4 naive B   tsc 0, hidden exit=1  Tests 2 failed | 13 passed
     × derives the lock reason from the subscription row and the instant
     × treats a cancellation as effective only once its date arrives
step4 naive C   tsc 0, hidden exit=1  Tests 2 failed | 13 passed
     × refuses membership changes and invitations while keeping them readable
     × checks the lock only after the tenant and permission checks
step5 determinism   run1/run2/run3: Tests 15 passed (15)
```

Determinism: every case runs under `vi.useFakeTimers({ toFake: ["Date"] })` pinned to
2026-03-01T09:00Z (so every trial created in the file ends 2026-03-15T09:00Z), moves the clock
explicitly (day 13 / day 14 / day 14 + 1h) and hands the jobs an explicit `now`. The boundary
instants are exercised only in the pure `lockReasonFor` case. No visible test encoded the old
policy (no visible fixture is past due, canceled or past its trial end), so `solution.patch`
changes no visible test.
