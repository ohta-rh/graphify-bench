# Validation — HIM7-issue-unassigned-event

Implement task (no bug.patch). All steps run on fresh APFS clones of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by `validate.sh` in the author's scratch dir.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/HIM7-issue-unassigned-event.test.ts`: `pnpm exec vitest run tests/hidden/HIM7-issue-unassigned-event.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. pristine + naive partial implementation + hidden: `pnpm exec vitest run tests/hidden/HIM7-issue-unassigned-event.test.ts`
5. hidden test 3x on the solved clone.

Note: the patch was generated in git format (`diff --git a/… b/…`) and verified with
`patch -p1`; git itself could not be run outside the author's worktree in this session.

Naive attempt (step 4): Event declared, emitted from assignIssue(null) instead of issue.updated, audit-log row + activity action. No notification kind, no webhook wiring, no member-removal producer.

## Results

```
step1 tsc exit=0
step1 suite: Test Files  73 passed (73)
step1 suite: Tests  617 passed (617)
step2 hidden exit=1
step2 Test Files  1 failed (1)
step2 Tests  6 failed (6)
step2 fail: × is an event type webhook endpoints can subscribe to, and is delivered only to them 1ms
step2 fail: × is not published for a reassignment or for clearing an already empty assignee 4ms
step2 fail: × is published for each live issue of a member who is removed 6ms
step2 fail: × is published instead of issue.updated when an assignee is cleared 8ms
step2 fail: × notifies the previous assignee, but not an actor who unassigned themselves 4ms
step2 fail: × records one audit row against the issue 2ms
step3 patch -p1 exit=0
step3 tsc exit=0
step3 full suite exit=0
step3 suite: Test Files  74 passed (74)
step3 suite: Tests  623 passed (623)
step5 run1 hidden exit=0 Tests  6 passed (6)
step5 run2 hidden exit=0 Tests  6 passed (6)
step5 run3 hidden exit=0 Tests  6 passed (6)
step4 naive applied exit=0
step4 tsc exit=2
step4 hidden exit=1
step4 Test Files  1 failed (1)
step4 Tests  3 failed | 3 passed (6)
step4 fail: × is an event type webhook endpoints can subscribe to, and is delivered only to them 2ms
step4 fail: × is published for each live issue of a member who is removed 48ms
step4 fail: × notifies the previous assignee, but not an actor who unassigned themselves 25ms
done HIM7-issue-unassigned-event
```
