# mini-corpus

A 3-file stand-in for `corpus/taskflow/`, used only by the harness smoke test.
It has no dependencies, so `bench/lib/copy.ts` and `bench/run.ts` can be
exercised end-to-end against a real `claude -p` call for cents rather than
dollars. It is NOT part of the benchmark.
