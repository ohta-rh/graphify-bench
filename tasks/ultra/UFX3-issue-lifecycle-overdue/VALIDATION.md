# UFX3-issue-lifecycle-overdue — validation

All runs on fresh APFS clones of the pristine corpus, commands run inside the clone.
`git apply` could not be executed (the agent sandbox refuses git outside its worktree), so patches were
applied with `patch -p1 -F0` (zero fuzz, exact context). Patches are git-style (`diff --git`, `a/` `b/`).

1. pristine + bug.patch
   - `patch -p1 -F0 < bug.patch` → clean (3 files)
   - `pnpm exec vitest run --exclude 'tests/hidden/**'` → 73 files / 617 tests pass
   - `pnpm exec tsc --noEmit` → exit 0
2. + hidden test → 10 of 12 fail: canceled counted open, overdue card count, completion date on reopen,
   sweep announces canceled, brand-new/deleted workspace coverage, re-announce after cancel+reopen,
   re-announce after due date moved out, alert kind, muted-alert preference, per-workspace alert inbox
3. + solution.patch → clean (5 files); hidden 12/12; full suite incl. hidden 74 files / 629 tests; tsc exit 0
4. Naive partial fixes (hidden test must still fail)
   - revert only the 4 injected defects (= pristine source) → 4/12 fail
   - full fix except the sweep query's closed-status set (still only `done`) → 2/12 fail
   - full fix except forgetting issues a sweep no longer finds overdue → 2/12 fail
5. Determinism: hidden test on the solved tree 3× → 12/12 each run
