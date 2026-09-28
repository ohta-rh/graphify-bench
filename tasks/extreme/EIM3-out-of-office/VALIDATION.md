# Validation — EIM3-out-of-office

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`). Git cannot be run outside the author's worktree in this session, so
the patch was produced with `diff -u` rewritten into git format (`diff --git a/… b/…`, `--- a/…`,
`+++ b/…`, `new file mode 100644` + `--- /dev/null` for new files) and applied with `patch -p1`.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/EIM3-out-of-office.test.ts`: `pnpm exec vitest run tests/hidden`
3. pristine + `patch -p1 --dry-run -i solution.patch` + `patch -p1 -i solution.patch` + hidden:
   `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. three naive implementations (solution clone minus the part named below) + hidden:
   `pnpm exec tsc --noEmit` (all three typecheck) ; `pnpm exec vitest run tests/hidden`
5. the hidden test three times on the solved clone.

Naive attempts (step 4):
- A, the obvious implementation: the absence API and storage, and the redirect in `assignIssue`
  only — creation with an assignee, the overdue fan-out, mentions and the removal scrub untouched.
- B, careful: both redirect paths, the overdue fan-out, the removal scrub — and the mention rule
  implemented as a second `notify()` call for the delegates after the ordinary mention call.
- C, near-complete, falls into the trap: everything, but "away" is decided as "the absence has not
  ended yet", ignoring the start of the window.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0
     Test Files  73 passed (73)
          Tests  617 passed (617)
step2 pristine + hidden
  hidden exit=1
          Tests  16 failed (16)      (TypeError: setAbsence is not a function, …)
step3 pristine + solution + hidden
  patch dry-run exit=0
  patch exit=0
  tsc exit=0
  full suite exit=0
     Test Files  74 passed (74)
          Tests  633 passed (633)
step4 naive A
  tsc exit=0
  hidden exit=1
         × redirects an assignment made when the issue is created
         × sends overdue alerts for an away member's issues to the delegate
         × alerts both an away member and their delegate on a mention, once each
         × stops standing in when the delegate leaves, and forgets the absence when the member leaves
          Tests  4 failed | 12 passed (16)
step4 naive B
  tsc exit=0
  hidden exit=1
         × alerts both an away member and their delegate on a mention, once each
          Tests  1 failed | 15 passed (16)
step4 naive C
  tsc exit=0
  hidden exit=1
         × redirects only between the start and the end of the window
          Tests  1 failed | 15 passed (16)
step5 determinism
  run1 exit=0   Tests  16 passed (16)
  run2 exit=0   Tests  16 passed (16)
  run3 exit=0   Tests  16 passed (16)
```

Determinism: every time-dependent call runs under `vi.setSystemTime` with fixed instants (the
overdue sweep gets the same instant as the clock); the overdue job's in-memory "already reported"
set is cleared before each case; every case has its own tenant; no assertion depends on generated
ids or on ordering within a timestamp tie.
