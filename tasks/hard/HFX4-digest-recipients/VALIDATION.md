# HFX4-digest-recipients validation

Fresh APFS clones of corpus-v1 (`cp -cR`). Patches applied with
`git apply --unsafe-paths --directory=<clone> -p1 <patch>` (clean, no fuzz).
Tests: `pnpm exec vitest run` (full) and `pnpm exec vitest run tests/hidden/<ID>.test.ts`; typecheck `pnpm exec tsc --noEmit`.

## 1-2. pristine + bug.patch (tsc, full visible suite, then hidden installed)

```
== step1 HFX4-digest-recipients @ v-HFX4
  tsc --noEmit: exit=0
  full suite: exit=0 Test Files  73 passed (73) | Tests  617 passed (617)
  hidden: exit=1 Test Files  1 failed (1) | Tests  4 failed | 1 passed (5)
    × mails only people who opted into the digest 18ms
    × keeps the most recent updates, newest first 29ms
    × leads the digest email with the most recent update 17ms
    × sends no digest for an archived workspace 4ms
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: who receives a digest > mails only people who opted into the digest
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: a busy day's digest > keeps the most recent updates, newest first
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: a busy day's digest > leads the digest email with the most recent update
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: archived workspaces > sends no digest for an archived workspace
    AssertionError: expected "sendEmail" to be called 1 times, but got 2 times
    AssertionError: expected [ 'Update 56', 'Update 55', …(48) ] to deeply equal [ 'Update 0', 'Update 1', …(48) ]
    AssertionError: expected 'Headline 52' to be 'Headline 0' // Object.is equality
    AssertionError: expected "sendEmail" to not be called at all, but actually been called 1 times
```

## 3 + 5. + solution.patch (hidden x3, full suite incl. hidden, tsc)

```
== step3 HFX4-digest-recipients @ v-HFX4
  hidden: exit=0 Test Files  1 passed (1) | Tests  5 passed (5)
  hidden: exit=0 Test Files  1 passed (1) | Tests  5 passed (5)
  hidden: exit=0 Test Files  1 passed (1) | Tests  5 passed (5)
  full suite: exit=0 Test Files  74 passed (74) | Tests  622 passed (622)
  tsc --noEmit: exit=0
```

## 4. Naive partial fixes (pristine + bug.patch + partial fix)

- fix only the digestOnly recipient filter:

```
== naive HFX4-digest-recipients @ n-HFX4-subscribers-only
  hidden: exit=1 Test Files  1 failed (1) | Tests  3 failed | 2 passed (5)
    × keeps the most recent updates, newest first 22ms
    × leads the digest email with the most recent update 25ms
    × sends no digest for an archived workspace 4ms
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: a busy day's digest > keeps the most recent updates, newest first
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: a busy day's digest > leads the digest email with the most recent update
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: archived workspaces > sends no digest for an archived workspace
    AssertionError: expected [ 'Update 56', 'Update 55', …(48) ] to deeply equal [ 'Update 0', 'Update 1', …(48) ]
    AssertionError: expected 'Headline 52' to be 'Headline 0' // Object.is equality
    AssertionError: expected "sendEmail" to not be called at all, but actually been called 1 times
```

- fix the recipient filter and the ordering, not the archived-org check:

```
== naive HFX4-digest-recipients @ n-HFX4-subscribers-order
  hidden: exit=1 Test Files  1 failed (1) | Tests  1 failed | 4 passed (5)
    × sends no digest for an archived workspace 16ms
    FAIL  tests/hidden/HFX4-digest-recipients.test.ts > HFX4: archived workspaces > sends no digest for an archived workspace
    AssertionError: expected "sendEmail" to not be called at all, but actually been called 1 times
```
