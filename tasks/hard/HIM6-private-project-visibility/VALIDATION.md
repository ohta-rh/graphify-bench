# Validation — HIM6-private-project-visibility

Implement task (no bug.patch). All steps run on fresh APFS clones of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by `validate.sh` in the author's scratch dir.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/HIM6-private-project-visibility.test.ts`: `pnpm exec vitest run tests/hidden/HIM6-private-project-visibility.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. pristine + naive partial implementation + hidden: `pnpm exec vitest run tests/hidden/HIM6-private-project-visibility.test.ts`
5. hidden test 3x on the solved clone.

Note: the patch was generated in git format (`diff --git a/… b/…`) and verified with
`patch -p1`; git itself could not be run outside the author's worktree in this session.

Naive attempt (step 4): canViewProject + NotFoundError in getProject only (the first/most obvious call site). Issues, board, thread, writes and listings untouched.

## Results

```
step1 tsc exit=0
step1 suite: Test Files  73 passed (73)
step1 suite: Tests  617 passed (617)
step2 hidden exit=1
step2 Test Files  1 failed (1)
step2 Tests  7 failed | 2 passed (9)
step2 fail: × answers NotFoundError for a private project the actor is not on 3ms
step2 fail: × applies the lead / project-member / admin rule to private projects only 2ms
step2 fail: × drops a hidden project's issues from the org-wide issue list, total included 2ms
step2 fail: × drops hidden projects from the listing, total included 2ms
step2 fail: × hides a private project's issues from single reads, the board and the thread 2ms
step2 fail: × refuses writes into a hidden project with NotFoundError 1ms
step2 fail: × takes effect immediately when someone is removed from the project 1ms
step3 patch -p1 exit=0
step3 tsc exit=0
step3 full suite exit=0
step3 suite: Test Files  74 passed (74)
step3 suite: Tests  626 passed (626)
step5 run1 hidden exit=0 Tests  9 passed (9)
step5 run2 hidden exit=0 Tests  9 passed (9)
step5 run3 hidden exit=0 Tests  9 passed (9)
step4 naive applied exit=0
step4 tsc exit=0
step4 hidden exit=1
step4 Test Files  1 failed (1)
step4 Tests  5 failed | 4 passed (9)
step4 fail: × drops a hidden project's issues from the org-wide issue list, total included 1ms
step4 fail: × drops hidden projects from the listing, total included 5ms
step4 fail: × hides a private project's issues from single reads, the board and the thread 2ms
step4 fail: × refuses writes into a hidden project with NotFoundError 1ms
step4 fail: × takes effect immediately when someone is removed from the project 2ms
done HIM6-private-project-visibility
```
