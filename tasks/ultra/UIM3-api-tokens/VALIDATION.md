# UIM3-api-tokens — validation

All runs on fresh APFS clones of `corpus-v1` (`cp -cR "$SNAP" <clone>`), vitest 4.1.11, 2026-09-28.
No `bug.patch` (implement task). `solution.patch` was produced with `git diff --no-index` (a/ b/ prefixes)
and applied with `patch -p1 -d <clone> -i solution.patch` (the agent sandbox blocks `git -C <scratch clone>`).
The hidden test fakes only `Date` and resets it to 2026-03-01T12:00Z before every case.

| Step | Command (in the clone) | Result |
|---|---|---|
| 1 pristine | `pnpm exec tsc --noEmit` / `pnpm exec vitest run` | exit 0 / 73 files, 617 passed |
| 2 pristine + hidden | `pnpm exec vitest run tests/hidden/UIM3-api-tokens.test.ts` | exit 1 — `Failed to resolve import "@/server/services/api-token-service"` (all 11 cases fail) |
| 3 + solution | `patch -p1 …` / `tsc --noEmit` / `vitest run` | apply clean / exit 0 / 74 files, 628 passed (617 + 11 hidden) |
| 4a naive: happy path | expiry compared with `<`, cap counts every token ever minted, no member-removal cascade | 3/11 fail (cap, exact-expiry instant, removal cascade) |
| 4b naive: one interaction missed | everything right except the removal cascade also re-revokes already-revoked tokens | 1/11 fail ("revokes a removed member's tokens in that organization only") |
| 5 determinism | hidden test run 3× on the solved clone | 11/11, 11/11, 11/11 |
