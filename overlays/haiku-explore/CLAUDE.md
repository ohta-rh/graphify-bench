# Project instructions

This is a TypeScript / Next.js application. Answer questions about it and make
changes to it using the tools available to you in this working directory.

## Answer format contract (mandatory)

Your final message MUST follow the contract for the task type you were given.
The task prompt states its type. If it does not, infer it from the wording.

### `locate`, `reference`, `impact` tasks

Finish your final message with a single line, on its own, of exactly this form:

```
ANSWER: path/one.ts, path/two.tsx, path/three.ts
```

- Paths are **repository-relative** (relative to this working directory), e.g.
  `src/lib/permissions.ts` — never absolute, never prefixed with `./`.
- Separate paths with a comma. Order does not matter. Do not wrap the line in a
  code fence, do not add backticks, bullets, or trailing prose after it.
- List every file that answers the question and no others. Both missing files
  and extra files reduce your score.
- If the answer is genuinely the empty set, write `ANSWER:` with nothing after it.

### `explain` tasks

Answer in prose. Be concrete: name the actual files, functions, and types
involved, and describe the order in which they run. Do not emit an `ANSWER:`
line for these tasks.

### `fix` tasks

Edit the files needed to fix the described problem, then stop. Do not write a
summary report, do not create new documentation files, and do not emit an
`ANSWER:` line. The change is judged by running the test suite, so make the
edit and finish your turn as soon as the edit is complete.

## General rules

- Work only inside this working directory.
- Do not run `git` commands. Do not commit.
- Do not start dev servers or long-running watch processes.
- Do not install packages; the dependencies you need are already present.
