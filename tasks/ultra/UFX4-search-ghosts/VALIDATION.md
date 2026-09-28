# UFX4-search-ghosts — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" v4`).

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/UFX4-search-ghosts.test.ts`, then `pnpm exec vitest run tests/hidden/UFX4-search-ghosts.test.ts` | 9/9 FAIL (every case, e.g. `expected [ '…0J', …(2) ] to deeply equal [ '…0R' ]` for comments of an archived issue; the large-workspace rebuild returns 100 of 110) |
| 3 | `git apply -p1 solution.patch` | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run` | 74 files, 626/626 pass (hidden 9/9) |
| 5 | hidden test × 3 | exit 0, 0, 0 |

## Naive partial fixes (on bug.patch)

| Attempt | Hidden result |
|---|---|
| A: fix only the rebuild job (live rows, all pages, clear the org first); listeners and writers untouched | 6/9 fail (issue archive keeps comments, project archive/restore, writes while archived) |
| B: searchability rule in the index writers and listeners (incl. `project.restored`); rebuild job untouched | 1/9 fail (`covers every issue and comment of a large workspace`: the job still reads only the first 100 issues) |
