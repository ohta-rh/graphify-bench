# EFX2-audit-trail — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" v-EFX2-audit-trail`), driven by a script that runs the commands below inside the clone (`scratchpad/extreme/A/validate.py`).

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/EFX2-audit-trail.test.ts`, then `pnpm exec vitest run tests/hidden/EFX2-audit-trail.test.ts` | 17/17 FAIL: status change without project, assignment attributed to assignee, comment edit/delete never recorded, project edit/restore never recorded, issue edit/archive never recorded, member join/removal never recorded, flag toggle never recorded, one-entry-per-action, write-time stamps, exclusive range end (same-instant export empty), reversed range accepted, export capped at 100, order, details dropped, cross-org export empty, project filter, actor filter |
| 3 | `git apply -p1 solution.patch` | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run tests/hidden/EFX2-audit-trail.test.ts` | 17/17 pass |
| 3 | `pnpm exec vitest run` | 74 files, 634/634 pass |
| 5 | hidden test × 3 on the solved clone | 17/17, 17/17, 17/17 |

## Naive partial fixes (on bug.patch; `scratchpad/extreme/A/naive-EFX2.py`)

| Attempt | Hidden result |
|---|---|
| A: revert only the four injected defects (project id on status changes, actor on assignments, metadata stored, inclusive `until`) | 12/17 fail |
| B: complete fix, but the export still reads a single page of 100 | 1/17 fail (`contains every entry in the window, however many, without duplicates`) |
| C: complete fix, but the export walks the window by moving `until` down to the oldest row seen, de-duplicating by id | 1/17 fail (same case: 100 of 230 rows that share a timestamp) |

Reference solution: 8 files, 291 changed lines across types, schema, service, repository and app/api layers.
