# AIM3-sub-issues — validation

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR "$SNAP" <clone>`), driven by `scratchpad/apex-work/tools/validate.py`. Git is not
available to this session outside its own worktree, so the patch (unified diff with `a/` `b/`
prefixes, `/dev/null` for new files) was applied with `patch -p1 --dry-run` followed by
`patch -p1`; it applies with `git apply -p1` the same way.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run` | exit 0; 73 files, 617/617 pass |
| 2 | pristine + `tests/hidden/AIM3-sub-issues.test.ts`: `pnpm exec vitest run tests/hidden/AIM3-sub-issues.test.ts` | exit 1 — the file cannot load (`@/lib/issue-hierarchy` missing), every case unavailable |
| 3 | fresh clone + `patch -p1 -i solution.patch` | applied cleanly (12 files) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 20/20 pass |
| 3 | `pnpm exec vitest run` (hidden included) | 74 files, 637/637 pass |
| 5 | hidden test x3, full suite x2 on the solved clone | 20/20, 20/20, 20/20; 637/637, 637/637 |

## Partial attempts (step 4), each derived from the reference solution

| Attempt | Hidden result |
|---|---|
| B: descendants read level by level through a page of 100 | 1/20 fail (`counts a parent with a hundred and fifty children in full`) |
| C: the parent validated on a later move only; creation stores whatever it is given | 2/20 fail (`refuses a parent of another project or workspace…`, `keeps the tree within the depth limit…`) |
| D: the archive cascade archives the descendants but announces only the root | 1/20 fail (`archives every live descendant with the issue, announcing each once…`) |
| E: the depth check looks at the issue alone, not at the subtree moving with it | 1/20 fail (`keeps the tree within the depth limit, counting the subtree that moves`) |
| F: the completion notice also fires when a move leaves the parent with nothing open | 1/20 fail (`is a closing, not a rearrangement: moving the last open sub-issue away says nothing`) |

Reference solution: 12 files, 386 changed lines across config, lib, types, schemas, drizzle schema, repositories, services and the UI label record.
