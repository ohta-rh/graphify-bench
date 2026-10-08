# BIM2-workspace-slug — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/brownfield-work/validate.py`. Git cannot be run in the scratch area from this session,
so both patches (git format, `/dev/null` for new files) were applied with `patch -p1 --dry-run`
followed by `patch -p1`.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 < bug.patch` | dry-run clean, applied cleanly (5 files: docs ×3, organization-repository, session-service) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/BIM2-workspace-slug.test.ts`; `pnpm exec vitest run tests/hidden/BIM2-workspace-slug.test.ts` | 15/15 FAIL (`ORG_SLUG_HOLD_DAYS` / `renameOrganizationSlug` missing) |
| 3 | fresh clone, `patch -p1 < bug.patch`, `patch -p1 < solution.patch` | both clean (12 files, 222 changed lines) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 (hidden test included) |
| 3 | hidden test | 15/15 pass |
| 3 | `pnpm exec vitest run` | 74 files, 632/632 pass |
| 5 | hidden × 3, full suite × 2 on the solved clone | 15/15, 15/15, 15/15; 632/632, 632/632 |

## Partial attempts (step 4; each applied on top of bug + solution, `scratchpad/brownfield-work/traps/BIM2/`)

| Attempt | Class | Hidden result |
|---|---|---|
| A: the old slug stops working immediately — nothing retired, no hold (product note) | followed the wrong document | tsc 0; 9/15 fail (every hold / redirect / creation-suffix case) |
| B: `resolveOrgBySlug` follows held slugs; the session layer still reads the current slug column | fixed one copy | tsc 0; 2/15 fail (session during the hold; the take-back case's session check) |
| C: an unavailable slug is suffixed the way creation suffixes a derived slug | filled a gap by guessing | tsc 0; 3/15 fail (taken; held; mid-chain) |
| D: renames refuse a held slug, but creation's taken-slug list ignores retired slugs | fixed one copy | tsc 0; 2/15 fail (creation suffixing; hold timing of the taken list) |

## Fairness read-through (step 6)

Re-read the prompt, `docs/README.md`, `docs/adr/0005-workspace-urls.md` and
`docs/product/workspace-rename-notes.md` as a newcomer:

- Omitted rule "unavailable → refused with the invalid-slug error, never suffixed": ADR §1 names the error family; `assertValidSlug` already throws `InvalidSlugError` for a reserved slug — forced.
- Omitted rule "unavailable = any workspace's current slug, deleted ones included, or another workspace's slug still held": ADR §2; the unique index on `organizations.slug` and `listTakenOrgSlugs` already count archived rows — forced.
- Omitted rule "the hold is exactly `ORG_SLUG_HOLD_DAYS` from the rename and applies to the session layer and every lookup": ADR §3 (explicit, including the release instant) — forced.
- Omitted rule "creation is suffixed past a held slug": ADR §3; `createOrganization` already suffixes with `uniqueSlug` — forced.
- Omitted rule "chains hold each slug; own retired slug can be taken back": ADR §4 — forced.
- Omitted rule "permission = the settings permission": ADR §5; `updateOrganization` guards with `org:update` — forced.
- Omitted rule "a deleted workspace's slugs never resolve": `findOrgBySlug` already excludes archived workspaces; README rule 5 — forced.
- Conflict 1 (old URL dies at once vs held for 30 days): README rule 2 → ADR §3 — resolved by the rule alone.
- Conflict 2 (owners only vs settings permission): README rule 2 → ADR §5.
- Conflict 3 (suffix a taken slug vs refuse): README rule 2 → ADR §1.
- The prompt points at the superseded product note and states no rule that contradicts the ADR.
