# AFX3-project-lifecycle — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/apex-work/tools/validate.py`. Git is not available to this session outside its own
worktree, so the patches (unified diffs with `a/` `b/` prefixes) were applied with
`patch -p1 --dry-run` followed by `patch -p1`; they apply with `git apply -p1` the same way.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 -i bug.patch` | applied cleanly (1 file) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/AFX3-project-lifecycle.test.ts`; `pnpm exec vitest run tests/hidden/AFX3-project-lifecycle.test.ts` | 17/21 FAIL: derived keys distinct, archived key reserved, explicit key unique within four characters, archived address reserved and restore intact, archiving frees a slot, restore refused when full, restore moves the meter, meter consistent through a cycle, live project not restorable, restored project keeps status, status sticks and filters, paused takes no issues, completed takes no issues, completion refused with an open issue, canceled/archived not open, open issue beyond the first hundred, pause always possible |
| 3 | `patch -p1 -i solution.patch` (on top of bug.patch) | applied cleanly (9 files) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 21/21 pass |
| 3 | `pnpm exec vitest run` (hidden included) | 74 files, 638/638 pass |
| 5 | hidden test x3, full suite x2 on the solved clone | 21/21, 21/21, 21/21; 638/638, 638/638 |

## Partial attempts (step 4)

| Attempt | Hidden result |
|---|---|
| A: pristine corpus — the three injected defects reverted, nothing else | 11/21 fail |
| B: complete fix, but the completion gate reads the first page (100) of the project's issues | 1/21 fail (`sees an open issue beyond the first hundred when completing`) |
| C: complete fix, but keys are made unique against the live project list only | 1/21 fail (`keeps the key of an archived project reserved`) |
| D: complete fix, but the usage meter has no listener for a restore | 2/21 fail (`takes the slot back on restore and moves the meter at once`, `keeps the meter consistent through archive, restore and archive again`) |

Reference solution: 9 files, 209 changed lines across lib, repositories, services and actions.
