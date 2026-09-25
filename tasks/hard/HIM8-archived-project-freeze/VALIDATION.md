# Validation — HIM8-archived-project-freeze

Implement task (no bug.patch). All steps run on fresh APFS clones of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by `validate.sh` in the author's scratch dir.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/HIM8-archived-project-freeze.test.ts`: `pnpm exec vitest run tests/hidden/HIM8-archived-project-freeze.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. pristine + naive partial implementation + hidden: `pnpm exec vitest run tests/hidden/HIM8-archived-project-freeze.test.ts`
5. hidden test 3x on the solved clone.

Note: the patch was generated in git format (`diff --git a/… b/…`) and verified with
`patch -p1`; git itself could not be run outside the author's worktree in this session.

Naive attempt (step 4): Project-archived guard added to issue-service writes only (update/status/move, assign, archive). Comments, attachments and the overdue sweep untouched.

## Results

```
step1 tsc exit=0
step1 suite: Test Files  73 passed (73)
step1 suite: Tests  617 passed (617)
step2 hidden exit=1
step2 Test Files  1 failed (1)
step2 Tests  7 failed (7)
step2 fail: × does not announce a frozen issue, but still announces live ones 2ms
step2 fail: × keeps the frozen issue readable 3ms
step2 fail: × lifts the freeze for writes and for the overdue sweep 4ms
step2 fail: × refuses adding and removing attachments 2ms
step2 fail: × refuses assigning, un-assigning and archiving the issue 2ms
step2 fail: × refuses field edits, status changes and board moves 11ms
step2 fail: × refuses posting, editing and deleting comments 2ms
step3 patch -p1 exit=0
step3 tsc exit=0
step3 full suite exit=0
step3 suite: Test Files  74 passed (74)
step3 suite: Tests  624 passed (624)
step5 run1 hidden exit=0 Tests  7 passed (7)
step5 run2 hidden exit=0 Tests  7 passed (7)
step5 run3 hidden exit=0 Tests  7 passed (7)
step4 naive applied exit=0
step4 tsc exit=0
step4 hidden exit=1
step4 Test Files  1 failed (1)
step4 Tests  5 failed | 2 passed (7)
step4 fail: × does not announce a frozen issue, but still announces live ones 1ms
step4 fail: × keeps the frozen issue readable 2ms
step4 fail: × lifts the freeze for writes and for the overdue sweep 4ms
step4 fail: × refuses adding and removing attachments 5ms
step4 fail: × refuses posting, editing and deleting comments 6ms
done HIM8-archived-project-freeze
```
