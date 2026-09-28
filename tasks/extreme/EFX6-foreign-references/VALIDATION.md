# EFX6-foreign-references — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), commands inside the clone.

| Step | Command | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass (no visible test needed editing) |
| 2 | copy `hidden.test.ts` to `tests/hidden/EFX6-foreign-references.test.ts`; `pnpm exec vitest run tests/hidden/EFX6-foreign-references.test.ts` | 16/19 FAIL (every refusal case `resolved instead of rejecting`; the planted foreign label is listed; mentions `expected [ …(3) ] to deeply equal [ admin ]`). Only the three happy-path cases pass on the bug. |
| 3 | `git apply -p1 solution.patch` (on top of bug.patch) | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run` | 74 files, 636/636 pass (hidden 19/19) |
| 5 | hidden test x3 on the solved clone | exit 0, 0, 0 |

## Naive fixes (each on bug.patch, fresh clone)

| Attempt | Hidden result |
|---|---|
| A: revert only the injected mention filter (back to the pristine member check) | 15/19 fail |
| B: full validation, but through org-scoped lookups so every bad reference is `not_found`, and the issue->labels join untouched | 5/19 fail (the five cross-workspace cases: `TenantScopeError` expected, and the previously attached foreign label still shown) |
| C: careful near-complete solution (all of solution.patch) except that a reply to a reply is accepted and attached under it | 1/19 fail (`refuses a reply to a deleted comment or to a reply`) |
