# EFX5-closed-workspace — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), commands inside the clone.

| Step | Command | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass (no visible test needed editing) |
| 2 | copy `hidden.test.ts` to `tests/hidden/EFX5-closed-workspace.test.ts`; `pnpm exec vitest run tests/hidden/EFX5-closed-workspace.test.ts` | 15/16 FAIL (second closing `resolved instead of rejecting`; subscription `expected 'trialing' to be 'canceled'`; slug lookup / session resolution / summary still return the closed org; invitation accepted; `notify` writes 2 rows; digest bundle built; overdue reminder sent; webhook job `expected 2 to be 1`; reindex `expected 2 to be +0`; trial expiry records a plan change for the closed org). Only "refuses a wrong confirmation" passes on the bug. |
| 3 | `git apply -p1 solution.patch` (on top of bug.patch) | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run` | 74 files, 633/633 pass (hidden 16/16) |
| 5 | hidden test x3 on the solved clone | exit 0, 0, 0 |

## Naive fixes (each on bug.patch, fresh clone)

| Attempt | Hidden result |
|---|---|
| A: revert only the two injected read regressions (slug lookup and workspace list live-only again) | 11/16 fail |
| B: A plus every organization read live-only, including the id lookup; nothing else | 8/16 fail (second closing is `not_found`, subscription still trialing, invitations still accepted, `notify` still writes under the free-plan fallback, overdue reminders and the trial downgrade still happen) |
| C: careful near-complete solution (all of solution.patch) plus the taken-slug scan made live-only "for consistency" | 1/16 fail: `SqliteError: UNIQUE constraint failed: organizations.slug` when a new workspace asks for the closed address |
| D: careful near-complete solution (all of solution.patch) minus the fan-out guard, trusting the null-org fallback | 1/16 fail (`writes no notification for the closed workspace`: 2 rows written) |
