# tasks/

| Path | Role |
|---|---|
| `tasks.schema.ts` | Zod schema + `parseTaskFile()`. The single source of truth for the task/key shape. |
| `tasks.example.json` | **Placeholder** file with 2 example tasks aimed at `bench/fixtures/mini-corpus`. Used only to smoke-test the harness. |
| `tasks.json` | The real 15-task set (Phase 3). Not present yet. |
| `keys/<id>.json` | Ground truth for `set-f1`: `{ "files": [...] }`, repo-relative paths. |
| `keys/<id>.md` | Rubric for `llm-judge`. One `- [ ]`-style bullet per required element. |
| `bugs/<id>.patch` | Bug injected before a `fix` run. Applied after the overlay, identically in both conditions. |

Both entries in `tasks.example.json` carry `"placeholder": true`. `bench/matrix.ts`
refuses to run a file whose tasks are all placeholders unless `--allow-placeholder`
is passed, so a placeholder can never silently end up in a real measurement.

Ground truth for categories 1/2/4 is derived mechanically with `ts-morph`
(`scripts/derive-keys.ts`, Phase 3) and reviewed by hand. graphify output is
never used to build a key — that would make the comparison circular.
