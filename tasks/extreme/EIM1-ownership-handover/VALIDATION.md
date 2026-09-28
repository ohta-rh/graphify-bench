# Validation — EIM1-ownership-handover

Implement task (no bug.patch). Every step ran on a fresh APFS clone of the pristine corpus
(`cp -cR corpus-v1 <clone>`). Git cannot be run outside the author's worktree in this session, so
the patch was produced with `diff -u` rewritten into git format (`diff --git a/… b/…`, `--- a/…`,
`+++ b/…`, `new file mode 100644` + `--- /dev/null` for new files) and applied with `patch -p1`.

Commands per step (inside each clone):
1. pristine: `pnpm exec tsc --noEmit`; `pnpm exec vitest run`
2. pristine + `tests/hidden/EIM1-ownership-handover.test.ts`: `pnpm exec vitest run tests/hidden`
3. pristine + `patch -p1 --dry-run -i solution.patch` + `patch -p1 -i solution.patch` + hidden:
   `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (full suite, hidden included)
4. three naive implementations (solution clone minus the part named below) + hidden:
   `pnpm exec tsc --noEmit` (all three typecheck) ; `pnpm exec vitest run tests/hidden`
5. the hidden test three times on the solved clone.

Naive attempts (step 4):
- A, the obvious minimum: ownership is the owner role (no recorded-owner check; any owner-role member
  may offer), roles swapped through the repository, `organizations.owner_id` untouched, no alert to
  the offered member, no expiry, removal does not withdraw an open offer.
- B, careful but reuses the existing operation: everything, with the two role changes made through
  `memberService.updateMemberRole(actor, …)` (promote first, then demote).
- C, near-complete, falls into the trap: everything (expiry, alert, withdrawal on removal, events,
  audit) except that `organizations.owner_id` never moves — the owner role is taken to be the
  ownership, so any owner-role member may offer and "the owner" the product follows stays stale.

## Results

```
step1 pristine
  tsc exit=0
  suite exit=0
     Test Files  73 passed (73)
          Tests  617 passed (617)
step2 pristine + hidden
  hidden exit=1
          Tests  18 failed (18)      (TypeError: initiateOwnershipHandover is not a function, …)
step3 pristine + solution + hidden
  patch dry-run exit=0
  patch exit=0
  tsc exit=0
  full suite exit=0
     Test Files  74 passed (74)
          Tests  635 passed (635)
step4 naive A
  tsc exit=0
  hidden exit=1
         × offers the workspace to an active member and alerts them
         × lets only the recorded owner offer the workspace
         × moves the recorded owner, swaps the roles and announces the handover on acceptance
         × lets a viewer accept and become the owner
         × changes only the former owner's role when the new owner already holds the owner role
         × sends new-member alerts to the new owner afterwards
         × lapses seven days after it was offered
         × is withdrawn when the offered member leaves the workspace
         × is withdrawn when the offering owner leaves the workspace
          Tests  9 failed | 9 passed (18)
step4 naive B
  tsc exit=0
  hidden exit=1
         × moves the recorded owner, swaps the roles and announces the handover on acceptance
         × lets a viewer accept and become the owner
         × hands billing to the new owner and takes it from the former one
         × sends new-member alerts to the new owner afterwards
         × lets the former owner be removed once the handover is done
          Tests  5 failed | 13 passed (18)
step4 naive C
  tsc exit=0
  hidden exit=1
         × lets only the recorded owner offer the workspace
         × moves the recorded owner, swaps the roles and announces the handover on acceptance
         × lets a viewer accept and become the owner
         × changes only the former owner's role when the new owner already holds the owner role
         × sends new-member alerts to the new owner afterwards
          Tests  5 failed | 13 passed (18)
step5 determinism
  run1 exit=0   Tests  18 passed (18)
  run2 exit=0   Tests  18 passed (18)
  run3 exit=0   Tests  18 passed (18)
```

Determinism: the expiry case pins the clock with `vi.setSystemTime` around each call; every case
has its own tenant; no assertion depends on generated ids or on ordering within a timestamp tie
(the two role-change events are matched with `arrayContaining`).
