# UFX5-sweep-starvation — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" v5`).

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/UFX5-sweep-starvation.test.ts`, then `pnpm exec vitest run tests/hidden/UFX5-sweep-starvation.test.ts` | 6/9 FAIL: wrong recount set, drift never corrected, 50 of 55 overdue alerts, deleted workspace alerted, 50 of 55 digests, 5 workspaces left uncleaned |
| 3 | `git apply -p1 solution.patch` | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run` | 74 files, 626/626 pass (hidden 9/9) |
| 5 | hidden test × 3 | exit 0, 0, 0 |

## Naive partial fixes (on bug.patch)

| Attempt | Hidden result |
|---|---|
| A: revert the work-list sort to ascending only | 6/9 fail |
| B: fix the recount completely (ascending sort, deltas no longer touch `measured_at`); sweeps untouched | 4/9 fail (overdue x2, digest, cleanup) |
| C: sweeps over every live org and ascending sort; deltas still bump `measured_at` | 2/9 fail (recount fairness) |
