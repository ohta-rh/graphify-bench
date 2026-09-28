# Validation — UIM6-issue-trash

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by the author's `validate.sh`.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/UIM6-issue-trash.test.ts`: `pnpm exec vitest run tests/hidden/UIM6-issue-trash.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden test included)
4. two naive implementations + hidden: `pnpm exec vitest run tests/hidden/UIM6-issue-trash.test.ts`
5. the hidden test 3x on the solved clone.

The patch is git-format (`diff --git a/… b/…`) and was applied with `patch -p1`.
Git could not be run outside the author's worktree in this session.

Naive attempts (step 4):
- A, the obvious call sites only: `restoreIssue` with its guards, the `not_archived`/`expired` refusals and the `issue.restored` event, plus the error mapping. The sweep deletes the expired issue rows it finds on the page it already lists (the first 100 issues by recency). It has no usage/search/audit listeners, no project/quota refusals, no cascade to comments/attachments/search/storage, and numbering is unchanged.
- B, every call site, but the interactions with existing rules were ignored: restore has no per-project quota, `nextIssueNumber` stays `max(number) + 1` over the surviving rows, and the purge does not give the storage counter back.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0
     Test Files  73 passed (73)
          Tests  617 passed (617)
step2 pristine + hidden
  hidden exit=1
          Tests  10 failed (10)
step3 pristine + solution + hidden
  patch dry-run exit=0
  patch exit=0
  tsc exit=0
  full suite exit=0
     Test Files  74 passed (74)
          Tests  627 passed (627)
step4 naive A
  tsc exit=0
  hidden exit=1
         × restores an archived issue with its number and tells every listener
         × refuses to restore a live issue or one whose project is archived
         × counts a restored issue against the per-project issue quota
         × purges an expired issue together with its comments and attachments
         × gives a purged issue's storage back to the quota
         × finds every expired issue, however many newer issues the workspace has
         × never hands out a purged issue's number again
          Tests  7 failed | 3 passed (10)
step4 naive B
  tsc exit=0
  hidden exit=1
         × counts a restored issue against the per-project issue quota
         × gives a purged issue's storage back to the quota
         × never hands out a purged issue's number again
          Tests  3 failed | 7 passed (10)
step5 determinism
  run1 exit=0   Tests  10 passed (10)
  run2 exit=0   Tests  10 passed (10)
  run3 exit=0   Tests  10 passed (10)
```

Determinism: archive and restore times are pinned with `vi.setSystemTime`, the sweep gets an explicit
`now`, and no window check sits on its boundary (29.5 vs 30.5 days on the 30-day plan; 20 vs 40 days
for the sweep). Each case uses its own tenant. The sweep also processes the file's other tenants, but
every assertion is scoped to the tenant under test.
