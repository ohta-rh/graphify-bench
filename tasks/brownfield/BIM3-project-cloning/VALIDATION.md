# BIM3-project-cloning — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/brownfield-work/validate.py`. Git cannot be run in the scratch area from this session,
so both patches (git format, `/dev/null` for new files) were applied with `patch -p1 --dry-run`
followed by `patch -p1`.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 < bug.patch` | dry-run clean, applied cleanly (6 files: docs ×3, project-repository, issue-repository, project-service) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/BIM3-project-cloning.test.ts`; `pnpm exec vitest run tests/hidden/BIM3-project-cloning.test.ts` | 14/15 FAIL (`cloneProject` is not a function); the project-quota case passes because the missing export rejects |
| 3 | fresh clone, `patch -p1 < bug.patch`, `patch -p1 < solution.patch` | both clean (9 files, 243 changed lines) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 (hidden test included) |
| 3 | hidden test | 15/15 pass |
| 3 | `pnpm exec vitest run` | 74 files, 632/632 pass |
| 5 | hidden × 3, full suite × 2 on the solved clone | 15/15, 15/15, 15/15; 632/632, 632/632 |

## Partial attempts (step 4; each applied on top of bug + solution, `scratchpad/brownfield-work/traps/BIM3/`)

| Attempt | Class | Hidden result |
|---|---|---|
| A: copies keep the source issue's status and assignee (product note: "the board of the copy looks exactly like the original") | followed the wrong document | tsc 0; 1/15 fail (fresh start) |
| B: the copies are indexed, but the project document and the workspace meters are left to the listeners that never fire | fixed one copy | tsc 0; 2/15 fail (searchable at once; meters) |
| C: the source's issues are read through one page of 100 | filled a gap by guessing / scale | tsc 0; 2/15 fail (150 issues; the 120-issue batch slips past the quota and writes) |
| D: copies keep their source numbers (product note: "cross-references still make sense") | followed the wrong document | tsc 0; 1/15 fail (archived left out, numbering from 1) |

## Fairness read-through (step 6)

Re-read the prompt, `docs/README.md`, `docs/adr/0012-cloning-a-project.md` and
`docs/product/project-clone-notes.md` as a newcomer:

- Omitted rule "description, visibility, colour, lead copied; active; no dates; slug suffixed when taken": ADR §1; `createProject` already derives the slug with `suggestProjectSlug` — forced.
- Omitted rule "read permission on the source, create permission, live source, project quota": ADR §2; the sibling guards in `getProject`, `createProject`, `archiveProject` show the actions and classes — forced.
- Omitted rule "live issues only; fields kept; status = workspace default; unassigned; no start/completion; author = cloner; no comments": ADR §3 lists every field; `OrganizationSettings.defaultIssueStatus` exists and is validated — forced.
- Omitted rule "numbered from 1 in source order; later issues continue": ADR §4; `nextIssueNumber` continues after the max — forced.
- Omitted rule "the per-project issue quota applies to the whole batch, before anything is written": ADR §5; `createIssue` counts live issues with `wouldExceedLimit`; `inviteMembers` is the batch precedent — forced.
- Omitted rule "one `project.cloned`, no creations, indexed and metered at once": ADR §6 (explicit) — forced.
- Omitted rule "every live issue, however many": ADR §5 counts the whole batch and the consequences say "a page is not a project" — forced.
- Conflict 1 (keep status/assignee vs fresh start): README rule 2 → ADR §3 — resolved by the rule alone.
- Conflict 2 (archived issues too vs live only): README rule 2 → ADR §3.
- Conflict 3 (numbers kept vs renumbered): README rule 2 → ADR §4.
- Conflict 4 (announce every copy, copy as many as fit vs one event, all or nothing): README rule 2 → ADR §§5–6.
- The prompt points at the superseded product note and states no rule that contradicts the ADR.
