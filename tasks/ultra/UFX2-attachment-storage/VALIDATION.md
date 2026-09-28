# UFX2-attachment-storage — validation

All runs on fresh APFS clones of the pristine corpus, commands run inside the clone.
`git apply` could not be executed (the agent sandbox refuses git outside its worktree), so patches were
applied with `patch -p1 -F0` (zero fuzz, exact context). Patches are git-style (`diff --git`, `a/` `b/`).

1. pristine + bug.patch
   - `patch -p1 -F0 < bug.patch` → clean (3 files)
   - `pnpm exec vitest run --exclude 'tests/hidden/**'` → 73 files / 617 tests pass
   - `pnpm exec tsc --noEmit` → exit 0
2. + hidden test → 8 of 12 fail: billing figure vs upload figure, removal give-back, exact-quota boundary
   (billing figure), recount per-file rounding, recount tenant scope, archived-issue file removal,
   old-issue file removal, trial over Free storage downgraded
3. + solution.patch → clean (5 files); hidden 12/12; full suite incl. hidden 74 files / 629 tests; tsc exit 0
4. Naive partial fixes (hidden test must still fail)
   - revert only the 4 injected defects (= pristine source) → 3/12 fail (recount rounding, old-issue removal, trial storage)
   - full fix except the recount (tenant filter + per-file rounding left as in the bug) → 4/12 fail
     (incl. downgrade-after-recount and trial-at-limit, which pass on the bug because other defects mask them)
5. Determinism: hidden test on the solved tree 3× → 12/12 each run
