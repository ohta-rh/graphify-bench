# EFX1-membership-lifecycle — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" v-EFX1-membership-lifecycle`), driven by a script that runs the commands below inside the clone (`scratchpad/extreme/A/validate.py`).

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/EFX1-membership-lifecycle.test.ts`, then `pnpm exec vitest run tests/hidden/EFX1-membership-lifecycle.test.ts` | 17/19 FAIL: accepted invitee cannot act / not counted, 14-day expiry (hours), wrong account accepts, deleted workspace accepts, second acceptance, expired and revoked invitations hold seats, duplicate batch, pending duplicate, current-member invite, resend role, resend of expired, rejoin crashes on `UNIQUE constraint failed: members.org_id, members.user_id`, seat counters, notifications to removed member, digest recipients, session default org |
| 3 | `git apply -p1 solution.patch` | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run tests/hidden/EFX1-membership-lifecycle.test.ts` | 19/19 pass |
| 3 | `pnpm exec vitest run` | 74 files, 636/636 pass |
| 5 | hidden test × 3 on the solved clone | 19/19, 19/19, 19/19 |

## Naive partial fixes (on bug.patch; `scratchpad/extreme/A/naive-EFX1.py`)

| Attempt | Hidden result |
|---|---|
| A: revert only the four injected defects (status active, days not hours, revoked filter, resend role) | 11/19 fail |
| B: invitation rules, email match, deleted-workspace check and rejoin fixed; notifications, digest and sessions untouched | 3/19 fail |
| C: complete fix, but resend still resolves the invitation through the pending list (which now excludes expired ones) | 1/19 fail (`works for an invitation that has already expired`) |

Reference solution: 9 files, 310 changed lines across service, repository and app layers.
