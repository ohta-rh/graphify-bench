# BIM1-issue-relocation — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/brownfield-work/validate.py`. Git cannot be run in the scratch area from this session,
so both patches (git format, `/dev/null` for new files) were applied with `patch -p1 --dry-run`
followed by `patch -p1`.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 < bug.patch` | dry-run clean, applied cleanly (5 files: docs ×3, issue-repository, issue-service) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/BIM1-issue-relocation.test.ts`; `pnpm exec vitest run tests/hidden/BIM1-issue-relocation.test.ts` | 15/16 FAIL (`moveIssueToProject` is not a function); the quota case passes because the missing export rejects |
| 3 | fresh clone, `patch -p1 < bug.patch`, `patch -p1 < solution.patch` | both clean (11 files, 176 changed lines) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 16/16 pass |
| 3 | `pnpm exec vitest run` | 74 files, 633/633 pass |
| 5 | hidden × 3, full suite × 2 on the solved clone | 16/16, 16/16, 16/16; 633/633, 633/633 |

## Partial attempts (step 4; each applied on top of bug + solution, `scratchpad/brownfield-work/traps/BIM1/`)

| Attempt | Class | Hidden result |
|---|---|---|
| A: the issue keeps its number across the move (product note: "links like PLAT-12 keep working") | followed the wrong document | tsc 0; 5/16 fail (next number; continuation; back-and-forth; retirement; keys) |
| B: row, event and audit entry move; the search document keeps the source project | fixed one copy | tsc 0; 1/16 fail (search scope) |
| C: next number derived as max(rows) + 1, no per-project sequence | filled a gap by guessing | tsc 0; 3/16 fail (vacated number re-issued; back-and-forth; retirement) |
| D: only `issue:update` on the issue is checked, not `issue:create` in the target | fixed one copy / guessed permission | tsc 0; 1/16 fail (viewer-assignee) |

## Fairness read-through (step 6)

Re-read the prompt, `docs/README.md`, `docs/adr/0011-moving-issues-between-projects.md` and
`docs/product/issue-move-notes.md` as a newcomer:

- Omitted rule "next number of the target, vacated number retired for good": ADR §2 states both; the repository docblock already says archived issues keep their number, so numbers are permanent — forced.
- Omitted rule "edit permission on the issue and create permission in the target": ADR §3; the sibling guards (`updateIssue` → `issue:update` on the issue, `createIssue` → `issue:create` on the project) show which actions — forced.
- Omitted rule "the target's per-project quota applies": ADR §3 (explicit); `createIssue`'s gate shows how it is counted — forced.
- Omitted rule "tenant / not-found / archived guards": every issue mutation uses `assertOrgScope`, `requireFound` and `assertNotArchived`; `createIssue` applies the same to the project — forced by convention (README rule 5).
- Omitted rule "search scoped to the target finds it": ADR §5; `indexIssue` writes the row's project — forced.
- Omitted rule "earlier audit entries stay, one entry under the target": ADR §4; the activity repository is documented append-only — forced.
- Omitted rule "no `issue.created` / `issue.updated` / `issue.archived`": ADR §6 — forced.
- Conflict 1 (keep the number vs renumber + retire): README rule 2 → ADR §2 — resolved by the rule alone.
- Conflict 2 (history re-filed vs append-only): README rule 2 → ADR §4.
- Conflict 3 (anyone who sees both projects, no quota vs edit + create permission and the quota): README rule 2 → ADR §3.
- The prompt points at the superseded product note and states no rule that contradicts the ADR.
