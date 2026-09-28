# UFX1-comment-delete-search — validation

All runs on fresh APFS clones of the pristine corpus (`cp -cR "$SNAP" …`), commands run inside the clone.
`git apply` could not be executed (the agent sandbox refuses git outside its worktree), so patches were
applied with `patch -p1 -F0` (zero fuzz, exact context). Patches are git-style (`diff --git`, `a/` `b/`).

1. pristine + bug.patch
   - `patch -p1 -F0 < bug.patch` → clean (3 files)
   - `pnpm exec vitest run --exclude 'tests/hidden/**'` → 73 files / 617 tests pass
   - `pnpm exec tsc --noEmit` → exit 0
2. + hidden test (`tests/hidden/UFX1-comment-delete-search.test.ts`)
   - `pnpm exec vitest run tests/hidden/UFX1-comment-delete-search.test.ts` → 8 of 10 fail:
     comment count, deleted comment in search, replies/issue kept, archived issue's comments,
     rebuild resurrects deleted comment, rebuild indexes orphan reply, rebuild resurrects archived issue,
     rebuild misses issues beyond 100
3. + solution.patch → clean (4 files); hidden 10/10; full suite incl. hidden 74 files / 627 tests; tsc exit 0
4. Naive partial fixes (hidden test must still fail)
   - revert only the 3 injected defects (= pristine source) → 4/10 fail (archive-drops-comments, rebuild of archived issue, >100 issues, >100 comments)
   - full fix except rebuild paging (single page of issues/comments) → 2/10 fail
   - full fix but rebuild keeps `listThread` and drops deleted top-level nodes → 1/10 fail (live reply of a deleted parent never indexed)
5. Determinism: hidden test on the solved tree 3× → 10/10 each run
