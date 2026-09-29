"""Extract the figures for docs/report-opus-ja.html from a results dir.
Usage: python3 extract.py results/opus  |  python3 extract.py results/hard
Pairs by task; with reps>1 the per-task value is the mean over reps."""
import json, glob, sys, random, statistics as st, collections
root = sys.argv[1]
R = collections.defaultdict(lambda: collections.defaultdict(list))  # arm -> task -> [run dicts]
for d in glob.glob(f"{root}/runs/*"):
    task, arm, rep = d.split("/")[-1].split("__")
    try:
        m = json.load(open(d + "/metrics.json")); meta = json.load(open(d + "/run.meta.json"))
    except FileNotFoundError:
        continue
    g = None
    try: g = json.load(open(d + "/grade.json")).get("success")
    except FileNotFoundError: pass
    if g is None and meta.get("vitest") and meta["vitest"].get("ran"):
        g = bool(meta["vitest"]["passed"])
    R[arm][task].append(dict(tok=m["uncached_equivalent_all"] or 0, cost=m["total_cost_usd"] or 0,
        wall=meta["claude"]["wall_ms"] / 1e3, ok=g, sub=(m.get("subagents_spawned") or 0) > 0,
        turns=m.get("num_turns") or 0, cat=meta["category"],
        think=(m.get("thinking_tokens") or 0)))
ARMS = ["opus-effort-low", "opus-effort-medium", "opus-effort-high", "opus-effort-xhigh", "effort-low-nosub", "effort-low", "effort-medium", "effort-high", "effort-xhigh", "sonnet55-effort-low", "sonnet55-effort-medium", "sonnet55-effort-high", "sonnet55-effort-xhigh"]
out = {"arms": {}, "pairs": {}}
for a in ARMS:
    runs = [r for t in R[a].values() for r in t]
    if not runs: continue
    graded = [r for r in runs if r["ok"] is not None]
    bycat = collections.defaultdict(lambda: [0, 0])
    for r in graded: bycat[r["cat"]][0] += r["ok"]; bycat[r["cat"]][1] += 1
    out["arms"][a] = dict(n=len(runs), acc=sum(r["ok"] for r in graded), graded=len(graded),
        tok_med=st.median(r["tok"] for r in runs), cost_med=st.median(r["cost"] for r in runs),
        cost_sum=sum(r["cost"] for r in runs), wall_med=st.median(r["wall"] for r in runs),
        sub_runs=sum(r["sub"] for r in runs), turns_med=st.median(r["turns"] for r in runs),
        bycat={k: v for k, v in bycat.items()},
        wall_self=st.median([r["wall"] for r in runs if not r["sub"]] or [0]),
        wall_sub=st.median([r["wall"] for r in runs if r["sub"]] or [0]),
        cost_per_success=(sum(r["cost"] for r in runs) / max(1, sum(r["ok"] for r in graded))))
def boot(x, y, k):
    ts = sorted(set(R[x]) & set(R[y]))
    f = (lambda L: st.mean(float(r[k]) for r in L))
    d = [f(R[x][t]) - f(R[y][t]) for t in ts]
    rnd = random.Random(7); bs = sorted(st.mean(rnd.choices(d, k=len(d))) for _ in range(10000))
    return dict(n=len(d), mean=st.mean(d), lo=bs[249], hi=bs[9750])
for x, y in [("opus-effort-low", "effort-low"), ("opus-effort-medium", "effort-medium"),
             ("opus-effort-low", "effort-low-nosub"), ("opus-effort-medium", "effort-low-nosub"),
             ("opus-effort-medium", "opus-effort-low"), ("effort-low-nosub", "effort-low"), ("opus-effort-high", "effort-high"), ("opus-effort-xhigh", "effort-xhigh"), ("opus-effort-low", "effort-high"), ("opus-effort-low", "effort-xhigh"), ("opus-effort-high", "opus-effort-low"), ("opus-effort-xhigh", "opus-effort-low"), ("effort-high", "effort-low"), ("effort-xhigh", "effort-low")] + [(f"sonnet55-effort-{e}", f"effort-{e}") for e in ("low","medium","high","xhigh")] + [(f"opus-effort-{e}", f"sonnet55-effort-{e}") for e in ("low","medium","high","xhigh")]:
    if set(R[x]) & set(R[y]):
        out["pairs"][f"{x}|{y}"] = {k: boot(x, y, k) for k in ("tok", "cost", "wall", "ok")}
json.dump(out, sys.stdout, indent=1)
