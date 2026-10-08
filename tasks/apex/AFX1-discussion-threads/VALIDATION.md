# AFX1-discussion-threads — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/apex-work/tools/validate.py`. Git is not available to this session outside its own
worktree, so the patches (unified diffs with `a/` `b/` prefixes) were applied with
`patch -p1 --dry-run` followed by `patch -p1`; they apply with `git apply -p1` the same way.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 -i bug.patch` | applied cleanly (4 files) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 616/616 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/AFX1-discussion-threads.test.ts`; `pnpm exec vitest run tests/hidden/AFX1-discussion-threads.test.ts` | 15/24 FAIL: 130-member mention, viewer/case-insensitive mention, shared handle, self-mention, mentioned assignee single alert, reply-author alert, direct-event de-duplication, reply-to-reply in thread, 30-deep chain, deleted opener placeholder, deleted reply placeholder, edit window from posting, mentions re-read on edit, 130-member mention on edit, edited text searchable |
| 3 | `patch -p1 -i solution.patch` (on top of bug.patch) | applied cleanly (10 files) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 24/24 pass |
| 3 | `pnpm exec vitest run` (hidden included) | 74 files, 640/640 pass |
| 5 | hidden test x3, full suite x2 on the solved clone | 24/24, 24/24, 24/24; 640/640, 640/640 |

## Partial attempts (step 4)

| Attempt | Hidden result |
|---|---|
| A: pristine corpus — the three injected defects reverted, nothing else | 13/24 fail |
| B: complete fix, but the member lookup is one "generous" page (`listMembers` with limit 1000, which the repository caps at 100) | 2/24 fail (`reaches a long-standing member of a workspace with 130 people`, `can mention a long-standing member of a large workspace on edit`) |
| C: complete fix with the shared full lookup on create, but the edit path re-resolves mentions with its own first-page lookup | 1/24 fail (`can mention a long-standing member of a large workspace on edit`) |
| D: complete fix, mention-versus-comment de-duplication in the fan-out, but the answered comment's author is alerted through a separate `notify()` call | 2/24 fail (`tells the answered author once even when they are also the assignee`, `gives the answered author who is also mentioned one alert, the mention`) |

Reference solution: 10 files, 296 changed lines across types, lib, repositories, services, actions and components.
