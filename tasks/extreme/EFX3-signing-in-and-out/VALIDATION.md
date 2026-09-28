# EFX3-signing-in-and-out — validation

Every step ran on a fresh APFS clone of the pristine corpus (`cp -cR "$SNAP" v-EFX3-signing-in-and-out`), driven by a script that runs the commands below inside the clone (`scratchpad/extreme/A/validate.py`).

| Step | Command (inside the clone) | Result |
|---|---|---|
| 1 | `git apply -p1 bug.patch` | applied cleanly |
| 1 | `pnpm exec tsc --noEmit` | exit 0 |
| 1 | `pnpm exec vitest run` | 73 files, 617/617 pass |
| 2 | copy `hidden.test.ts` to `tests/hidden/EFX3-signing-in-and-out.test.ts`, then `pnpm exec vitest run tests/hidden/EFX3-signing-in-and-out.test.ts` | 9/15 FAIL: sign-out ends everyone's sessions, sign-in after sign-out, remember-me lifetime, reset leaves sessions alive, one-minute links, used link replayable, older link still works, sign-in throttle shared across accounts, reset-request throttle shared across addresses |
| 3 | `git apply -p1 solution.patch` | applied cleanly |
| 3 | `pnpm exec tsc --noEmit` | exit 0 |
| 3 | `pnpm exec vitest run tests/hidden/EFX3-signing-in-and-out.test.ts` | 15/15 pass |
| 3 | `pnpm exec vitest run` | 74 files, 632/632 pass |
| 5 | hidden test × 3 on the solved clone | 15/15, 15/15, 15/15 |

## Naive partial fixes (on bug.patch; `scratchpad/extreme/A/naive-EFX3.py`)

| Attempt | Hidden result |
|---|---|
| A: revert only the three injected defects (sweep by expiry, used-token filter, 60-minute links) | 7/15 fail |
| B: A + sign-out revokes the token's session, reset ends all sessions, newest link retires older ones; throttles and remember-me untouched | 3/15 fail |
| C: complete fix, but sign-out ends every session of the account (the helper the reset needs) | 2/15 fail (`ends that session only`, `is harmless for an unknown or already-ended session`) |

Reference solution: 8 files, 149 changed lines across config, lib, service, repository and actions layers.
