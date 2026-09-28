# EFX4-former-members — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" <clone>`), commands inside the clone.

| Step | Command | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass (no visible test needed editing) |
| 2 | copy `hidden.test.ts` to `tests/hidden/EFX4-former-members.test.ts`; `pnpm exec vitest run tests/hidden/EFX4-former-members.test.ts` | 13/18 FAIL (e.g. `resolveActorForOrg` still returns an actor for the removed member; notifications total `expected 2 to be 1`; create/assign/lead calls `resolved instead of rejecting`; role change / second removal resolve; re-join returns role `'member'` instead of `'admin'`, no `member.joined`; already-member accept leaves 2 pending invitations) |
| 3 | `git apply -p1 solution.patch` (on top of bug.patch) | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run` | 74 files, 635/635 pass (hidden 18/18) |
| 5 | hidden test x3 on the solved clone | exit 0, 0, 0 |

## Naive fixes (each on bug.patch, fresh clone)

| Attempt | Hidden result |
|---|---|
| A: restore only `status: "suspended"` on removal | 12/18 fail (access is blocked, but re-join returns the archived row; notifications, references, cascade, conflicts all still fail) |
| B: restore only the live-row predicate on the (org, user) lookup | 12/18 fail, re-join dies with `SqliteError: UNIQUE constraint failed: members.org_id, members.user_id` |
| C: careful near-complete solution (everything in solution.patch) except that a returning member is re-inserted as a new row after deleting the old one | 1/18 fail (`re-admits a former member as the member they were`: member id changed) |
