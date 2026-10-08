# BFX2-issue-filters — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/brownfield-work/validate.py`. Git cannot be run in the scratch area from this session,
so both patches (git format, `/dev/null` for new files) were applied with `patch -p1 --dry-run`
followed by `patch -p1`.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 < bug.patch` | dry-run clean, applied cleanly (4 files: docs ×3, issue-repository) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/BFX2-issue-filters.test.ts`; `pnpm exec vitest run tests/hidden/BFX2-issue-filters.test.ts` | 11/15 FAIL: codec group expansion; archived=1 vs only; schema vocabulary; unassigned with total; me for assignee/author; labels all-of; calendar date inclusive; groups at the service; archived-only listing; combined dimensions; URL round trip. (Passing on the bug tree: me passes through the codec; calendar date kept by the codec; schema still refuses garbage; timestamp strictly before.) |
| 3 | fresh clone, `patch -p1 < bug.patch`, `patch -p1 < solution.patch` | both clean (8 files, 301 changed lines) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 15/15 pass |
| 3 | `pnpm exec vitest run` | 74 files, 632/632 pass |
| 5 | hidden × 3, full suite × 2 on the solved clone | 15/15, 15/15, 15/15; 632/632, 632/632 |

## Partial attempts (step 4; each applied on top of bug + solution, `scratchpad/brownfield-work/traps/BFX2/`)

| Attempt | Class | Hidden result |
|---|---|---|
| A: labels stay any-of, as the product note says | followed the wrong document | tsc 0; 2/15 fail (labels all-of; combined dimensions) |
| B: status groups expanded by the URL codec only; schema and repository untouched | fixed one copy | tsc 0; 3/15 fail (schema vocabulary; groups at the service; combined dimensions) |
| C: a calendar date in `due_before` read as midnight at the start of the day, strictly before | filled a gap by guessing | tsc 0; 2/15 fail (calendar date inclusive; URL round trip) |
| D: `archived=only` understood by codec and schema, ignored by the repository | fixed one copy | tsc 0; 1/15 fail (archived listing) |

## Fairness read-through (step 6)

Re-read the prompt, `docs/README.md`, `docs/adr/0009-issue-list-filters.md` and
`docs/product/issue-list-notes.md` as a newcomer:

- Omitted rule "`me` is resolved by the service, passes through codec and schema": ADR §2 states it; the sidebar nav already emits `assignee=me` — forced.
- Omitted rule "open = every non-closed status, closed = done + canceled": ADR §3 defines the groups by "what the project card and the digest count as closed", which is `CLOSED_ISSUE_STATUSES`; the My-issues page lists the same four open statuses — forced.
- Omitted rule "a full timestamp stays strictly-before": ADR §5 says "as it always has"; the pristine predicate is `lt` — forced.
- Omitted rule "`archived=only`": ADR §6 — forced.
- Omitted rule "total counts the filter's matches at every entry point": ADR §8; the repository already counts with its listing predicates — forced.
- Omitted rule "a repeated label id counts once": an issue carries a label at most once (`issue_labels_pk` unique index), so all-of over {bug, bug} is all-of over {bug} — forced.
- Conflict 1 (labels any-of vs all-of): README rule 2 → ADR §4 — resolved by the rule alone.
- Conflict 2 (`due_before` exclusive midnight vs inclusive calendar day): README rule 2 → ADR §5.
- Conflict 3 (no archived-only view vs `archived=only`): README rule 2 → ADR §6.
- The prompt points at the superseded product note and states no rule that contradicts the ADR.
