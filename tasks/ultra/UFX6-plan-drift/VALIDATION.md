# UFX6-plan-drift — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" v6`).

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/UFX6-plan-drift.test.ts`, then `pnpm exec vitest run tests/hidden/UFX6-plan-drift.test.ts` | 11/14 FAIL (e.g. `Plan free allows 2 projects` after the upgrade to Growth, `Plan free includes 3 seats and 4 are taken`, a webhook still created after the downgrade, a burst of comments stopping at 60, `expected 'free' to be 'starter'` for a plan chosen during the trial). The 3 passing cases are guards: refused downgrade, over-quota trial, workspace without a subscription |
| 3 | `git apply -p1 solution.patch` | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run` | 74 files, 631/631 pass (hidden 14/14) |
| 5 | hidden test × 3 | exit 0, 0, 0 |

## Naive partial fixes (on bug.patch)

| Attempt | Hidden result |
|---|---|
| A: keep `organizations.plan` in sync on every subscription plan write, restore the trialing predicate, pass the plan to the limiter; no read-side resolution | 1/14 fail (`workspaces whose records already disagree follow their subscription`) |
| B: read-side resolution + write sync + limiter; trialing predicate not restored | 1/14 fail (`a workspace that chose a plan during its trial keeps it after the trial window`) |
