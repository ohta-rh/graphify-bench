# BFX1-search-queries — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/brownfield-work/validate.py`. Git cannot be run in the scratch area from this session,
so both patches (git format, `/dev/null` for new files) were applied with `patch -p1 --dry-run`
followed by `patch -p1`.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 < bug.patch` | dry-run clean, applied cleanly (7 files) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/BFX1-search-queries.test.ts`; `pnpm exec vitest run tests/hidden/BFX1-search-queries.test.ts` | 14/18 FAIL: colon as text on Starter; literal would-be syntax + issues-only narrowing on Starter; kind:/in: tokens; project: token scope; unknown tokens dropped; issues-only with total on Starter; override enables the language; % literal; _ literal; comment under its project on creation; after rebuild; after reindex request; project reindex request; archived issue stays out after reindex request. (Passing on the bug tree: caller's kinds with the flag, backslash literal, case-insensitive, cross-workspace project token.) |
| 3 | fresh clone, `patch -p1 < bug.patch`, `patch -p1 < solution.patch` | both clean (8 files, 310 changed lines) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 18/18 pass |
| 3 | `pnpm exec vitest run` | 74 files, 635/635 pass |
| 5 | hidden × 3, full suite × 2 on the solved clone | 18/18, 18/18, 18/18; 635/635, 635/635 |

## Partial attempts (step 4; each applied on top of bug + solution, `scratchpad/brownfield-work/traps/BFX1/`)

| Attempt | Class | Hidden result |
|---|---|---|
| A: keep the product note's rule — a colon on a plan without advanced search throws | followed the wrong document | tsc 0; 3/18 fail (colon as text; literal syntax on Starter; override case) |
| B: the comment.created listener resolves the issue's project and upserts directly; `indexComment` (rebuild job, reindex requests) still writes `null` | fixed one copy | tsc 0; 2/18 fail (rebuild job; comment reindex request) |
| C: wildcards neutralised by stripping `%` and `_` from the query instead of escaping | filled a gap by guessing | tsc 0; 3/18 fail (%, _, backslash) |
| D: kinds narrowing restored in the Server Action and the API route only; the service searches whatever is asked | fixed one copy | tsc 0; 2/18 fail (Starter literal/narrowing cases) |

## Fairness read-through (step 6)

Re-read the prompt, `docs/README.md`, `docs/adr/0007-search-query-language.md` and
`docs/product/search-notes.md` as a newcomer:

- Omitted rule "tokens override the caller's kinds; `in:` alias, plural tolerated; unknown/empty tokens dropped": ADR §2, and the pristine client parser implements exactly this — forced.
- Omitted rule "an org override enables the language on Starter": ADR §4 says flags are evaluated plan-then-overrides; `advanced_search` is `overridable: true` in `config/feature-flags.ts`; the pristine service already passes overrides — forced.
- Omitted rule "`total` covers only the kinds searched": ADR §4; the repository counts with the predicates it lists with — forced.
- Omitted rule "backslash is literal": ADR §1 names `\` explicitly — forced.
- Omitted rule "a reindex request leaves an archived issue out": ADR §7 in parentheses; the sibling `issue.archived` listener removes the document — forced.
- Omitted rule "a `project:` token for another workspace's project returns nothing": every repository read is org-scoped (`orgPredicate`); the ADR scopes `project:` within the workspace — forced.
- Conflict 1 (colon on lower plans): README precedence rule 2 → ADR §3 — resolved by the rule alone.
- Conflict 2 (comments and project scope): README precedence rule 2 → ADR §6 — resolved by the rule alone.
- The prompt points at the superseded product note but states no rule that contradicts the ADR.
