# BFX3-sign-up — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), driven by
`scratchpad/brownfield-work/validate.py`. Git cannot be run in the scratch area from this session,
so both patches (git format, `/dev/null` for new files) were applied with `patch -p1 --dry-run`
followed by `patch -p1`.

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `patch -p1 < bug.patch` | dry-run clean, applied cleanly (5 files: docs ×3, user-repository, auth-service) |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/BFX3-sign-up.test.ts`; `pnpm exec vitest run tests/hidden/BFX3-sign-up.test.ts` | 9/15 FAIL: reserved names; one-letter fallback; workspace name limit; case-insensitive sign-up/sign-in; duplicate address conflict; welcome email to the stored address; sign-up throttled with rate_limited; refill; throttled sign-in reports rate_limited. (Passing on the bug tree: two-letter name; nothing-sluggable fallback; same-name suffix; diacritics; Free/active/owner; member.joined once.) |
| 3 | fresh clone, `patch -p1 < bug.patch`, `patch -p1 < solution.patch` | both clean (11 files, 258 changed lines) |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | hidden test | 15/15 pass |
| 3 | `pnpm exec vitest run` | 74 files, 632/632 pass |
| 5 | hidden × 3, full suite × 2 on the solved clone | 15/15, 15/15, 15/15; 632/632, 632/632 |

## Partial attempts (step 4; each applied on top of bug + solution, `scratchpad/brownfield-work/traps/BFX3/`)

| Attempt | Class | Hidden result |
|---|---|---|
| A: the first workspace starts a Growth trial, as the product note says | followed the wrong document | tsc 0; 1/15 fail (Free + active subscription) |
| B: sign-up throws the mapped rate-limit error, sign-in keeps its plain `Error` | fixed one copy | tsc 0; 1/15 fail (throttled sign-in reports rate_limited) |
| C: the slug comes from `uniqueSlug()` alone — reserved words and collisions handled, no minimum-length / `workspace` fallback | filled a gap by guessing | tsc 0; 2/15 fail (one-letter name; nothing-sluggable name) |
| D: the address is lowercased when stored, but the lookup compares as typed and sign-in does not normalise | fixed one copy | tsc 0; 2/15 fail (case-insensitive sign-in; duplicate with a different case) |

## Fairness read-through (step 6)

Re-read the prompt, `docs/README.md`, `docs/adr/0003-account-creation.md` and
`docs/product/sign-up-notes.md` as a newcomer:

- Omitted rule "a reserved name is suffixed (`admin-2`)": ADR §2 says reserved slugs are never used and collisions get the numeric suffix every derived slug gets; `uniqueSlug()`'s own visible test shows `Billing → billing-2` — forced.
- Omitted rule "shorter than the minimum, or empty, falls back to `workspace`": ADR §2 names both the minimum length and the fallback; `SLUG_MIN_LENGTH` is exported by `lib/slug` — forced.
- Omitted rule "throttle refusals carry `rate_limited` and are mapped by the error mapper": ADR §5; `HTTP_STATUS_BY_CODE.rate_limited` already exists; every domain error in `lib/errors` is a class with a `readonly code` and one mapping — forced.
- Omitted rule "a duplicate address is `conflict`": ADR §4 names the code; `AlreadyArchivedError` shows the class convention — forced.
- Omitted rule "Free plan, active subscription": ADR §6; `insertSubscription` already makes a free plan active and a paid one trialing — forced.
- Omitted rule "`member.joined` exactly once, welcome email once naming the workspace": ADR §1 and §7; `createOrganization` already emits, the pristine render call passes `orgName` — forced.
- Conflict 1 (Growth trial vs Free): README rule 2 → ADR §6 — resolved by the rule alone.
- Conflict 2 (silent success vs conflict): README rule 2 → ADR §4.
- Conflict 3 (no sign-up throttle vs `auth:register`): README rule 2 → ADR §5.
- The prompt points at the superseded product note and states no rule that contradicts the ADR.
