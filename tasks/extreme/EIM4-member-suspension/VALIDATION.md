# Validation — EIM4-member-suspension

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`). Git could not be run outside the author's worktree in this
session, so the patch (git format: `diff --git a/… b/…`, `/dev/null` for new files) was applied
with `patch -p1` (dry-run first).

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/EIM4-member-suspension.test.ts`: `pnpm exec vitest run tests/hidden/EIM4-member-suspension.test.ts`
3. fresh pristine clone + `patch -p1 --dry-run < solution.patch` + `patch -p1 < solution.patch` + hidden test: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. three naive implementations + hidden test: `pnpm exec tsc --noEmit`; `pnpm exec vitest run tests/hidden/EIM4-member-suspension.test.ts`
5. the hidden test 3x on the solved clone.

Naive attempts (step 4), each derived from the reference solution:
- A, the obvious partial: API + events + audit + org-switcher exclusion + assignment refusal + fan-out skip. Seat counters, mention filtering, digest skip and the last-owner rule left untouched.
- B, careful and near-complete (the trap): every consumer handled, including a correct "last active owner" check inside `suspendMember` — but the shared helper that protects the last owner from demotion and removal still counts suspended owners.
- C, everything, except the two seat counters keep filtering `status = 'active'` (a suspended member frees a seat) and only parsed `@handles` are filtered — client-supplied mention ids of a suspended member pass through.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0     Test Files 73 passed   Tests 617 passed
step2 pristine + hidden
  hidden exit=1    Tests 15 failed (15)   (every case: suspendMember is not a function)
step3 fresh clone + solution.patch + hidden
  patch dry-run exit=0 / patch exit=0 (13 files, 222 changed lines)
  tsc exit=0
  full suite exit=0  Test Files 74 passed   Tests 632 passed (617 + 15)
step4 naive A   tsc 0, hidden exit=1  Tests 5 failed | 10 passed
     × never suspends the last owner who is not already suspended
     × does not count a suspended owner when protecting the last owner from demotion or removal
     × keeps the suspended member's seat in every seat count
     × skips a suspended member in the digest and catches them up once reinstated
     × drops a suspended member from mentions, whether typed or supplied by the client
step4 naive B   tsc 0, hidden exit=1  Tests 1 failed | 14 passed
     × does not count a suspended owner when protecting the last owner from demotion or removal
step4 naive C   tsc 0, hidden exit=1  Tests 2 failed | 13 passed
     × keeps the suspended member's seat in every seat count
     × drops a suspended member from mentions, whether typed or supplied by the client
step5 determinism   run1/run2/run3: Tests 15 passed (15)
```

Determinism: the only instants that matter are fixed (`vi.useFakeTimers({ toFake: ["Date"] })`
around the digest notification, explicit `now` for the jobs, `resetOverdueTracking()` per case).
Every assertion filters by tenant, recipient or issue id, so the other tenants in the file never
interfere. No visible test encoded the old policy, so `solution.patch` changes no visible test.
