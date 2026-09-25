# Validation — HIM5-free-viewer-seats

Implement task (no bug.patch). All steps run on fresh APFS clones of the pristine corpus
(`cp -cR corpus-v1 <clone>`), driven by `validate.sh` in the author's scratch dir.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/HIM5-free-viewer-seats.test.ts`: `pnpm exec vitest run tests/hidden/HIM5-free-viewer-seats.test.ts`
3. pristine + `patch -p1 < solution.patch` (dry-run first) + hidden: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. pristine + naive partial implementation + hidden: `pnpm exec vitest run tests/hidden/HIM5-free-viewer-seats.test.ts`
5. hidden test 3x on the solved clone.

Note: the patch was generated in git format (`diff --git a/… b/…`) and verified with
`patch -p1`; git itself could not be run outside the author's worktree in this session.

Naive attempt (step 4): isBillableRole + invite-flow seat counting only (billable members + billable pending invites, viewer invites request no seat). Role changes, usage recount, usage listeners untouched.

## Results

```
step1 tsc exit=0
step1 suite: Test Files  73 passed (73)
step1 suite: Tests  617 passed (617)
step2 hidden exit=1
step2 Test Files  1 failed (1)
step2 Tests  8 failed (8)
step2 fail: × asks a mixed batch for its billable invites only, and ignores pending viewer invites 3ms
step2 fail: × counts pending billable invitations when promoting a viewer 2ms
step2 fail: × is false for viewers only 3ms
step2 fail: × keeps the incremental seat counter in step as members join, change role and leave 2ms
step2 fail: × lets an org full of viewers downgrade to a plan that fits its billable seats 5ms
step2 fail: × never refuses viewer invites on a full plan, but still refuses billable ones 11ms
step2 fail: × recounts billable members only, so checkLimit agrees 3ms
step2 fail: × refuses to promote a viewer into a billable role when no seat is free 4ms
step3 patch -p1 exit=0
step3 tsc exit=0
step3 full suite exit=0
step3 suite: Test Files  74 passed (74)
step3 suite: Tests  625 passed (625)
step5 run1 hidden exit=0 Tests  8 passed (8)
step5 run2 hidden exit=0 Tests  8 passed (8)
step5 run3 hidden exit=0 Tests  8 passed (8)
step4 naive applied exit=0
step4 tsc exit=0
step4 hidden exit=1
step4 Test Files  1 failed (1)
step4 Tests  5 failed | 3 passed (8)
step4 fail: × counts pending billable invitations when promoting a viewer 4ms
step4 fail: × keeps the incremental seat counter in step as members join, change role and leave 3ms
step4 fail: × lets an org full of viewers downgrade to a plan that fits its billable seats 6ms
step4 fail: × recounts billable members only, so checkLimit agrees 2ms
step4 fail: × refuses to promote a viewer into a billable role when no seat is free 5ms
done HIM5-free-viewer-seats
```
