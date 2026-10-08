# AFX2-alerts-and-inbox — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/apex-work/tools/validate.py`. Git is not available to this session outside its own
worktree, so the patches (unified diffs with `a/` `b/` prefixes) were applied with
`patch -p1 --dry-run` followed by `patch -p1`; they apply with `git apply -p1` the same way.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 -i bug.patch` | applied cleanly (2 files) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/AFX2-alerts-and-inbox.test.ts`; `pnpm exec vitest run tests/hidden/AFX2-alerts-and-inbox.test.ts` | 20/24 FAIL: another member's inbox refused, another member's alert not markable, mark-all-read own only, another member's preferences refused, assignment link, assignment at creation, comment/mention links, overdue link, new-member alert to the owner with the members link, search-hit links, digest links, status change by somebody else, board move / unassigned issue, project refusal alert with billing link, no repeat while unread, one per resource, seats refusal, issue-quota refusal, storage refusal, webhook refusal |
| 3 | `patch -p1 -i solution.patch` (on top of bug.patch) | applied cleanly (14 files) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 24/24 pass |
| 3 | `pnpm exec vitest run` (hidden included) | 74 files, 641/641 pass |
| 5 | hidden test x3, full suite x2 on the solved clone | 24/24, 24/24, 24/24; 641/641, 641/641 |

## Partial attempts (step 4)

| Attempt | Hidden result |
|---|---|
| A: pristine corpus — the two injected defects reverted, nothing else | 20/24 fail |
| B: complete fix, but the links are resolved in the notification fan-out only; search keeps its hand-built hrefs | 1/24 fail (`links search hits to the pages of what they found`) |
| C: complete fix, but the limit event is emitted from the two guards the report leads with (projects, seats) only | 3/24 fail (`issue refused for the project's quota`, `upload refused for lack of storage`, `endpoint refused for the webhook quota`) |
| D: complete fix, but the owner alert is keyed on the existing event alone, so the usage recount's 90% event alerts too | 1/24 fail (`says nothing when the periodic recount merely finds the plan full`) |
| E: complete fix without de-duplication of the owner alert | 1/24 fail (`does not repeat the alert while it is unread, and does once it has been read`) |
| F: complete fix, but an issue created with an assignee is not treated as an assignment | 6/24 fail (every case that assigns at creation) |

Reference solution: 13 source files + 1 visible test, 294 changed lines across types, repositories, services and jobs.
