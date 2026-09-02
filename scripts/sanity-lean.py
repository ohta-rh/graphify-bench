#!/usr/bin/env python3
"""Phase 12 sanity gate over results/lean.

Everything here is a check that would have caught a silently-broken arm:
whether the treatment reached `claude`, whether the tool allowlist actually
suppressed the excluded tools in the transcripts, whether the haiku arms ran on
haiku, and whether `total_cost_usd` reconciles with `modelUsage`. A red line
here means the measurement is not usable, not that a number came out unexpected.
"""
import collections
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUNS = os.path.join(ROOT, "results", "lean", "runs")
ARMS = ["lean-tools", "few-turns", "haiku-nosub", "all-in"]
LEAN_ARMS = {"lean-tools", "all-in"}
HAIKU_ARMS = {"haiku-nosub", "all-in"}
ALLOWED = {"Read", "Grep", "Glob", "Bash", "Edit"}

fail = []


def check(ok, msg):
    print(("  ok   " if ok else "  FAIL ") + msg)
    if not ok:
        fail.append(msg)


metas = sorted(glob.glob(os.path.join(RUNS, "*", "run.meta.json")))
print(f"runs found: {len(metas)}")
check(len(metas) == 180, "180 run directories")

by_arm = collections.defaultdict(list)
cost_total = 0.0
model_cost_total = 0.0
tool_use = collections.defaultdict(collections.Counter)
turns = collections.defaultdict(list)

for f in metas:
    m = json.load(open(f))
    arm = m["condition"]
    by_arm[arm].append(m)
    argv = m["claude"]["argv"] or []
    # `run.meta.json`'s `transcript` block records where the JSONL was captured
    # from; the parsed `claude -p --output-format json` payload is `result.json`.
    rp = os.path.join(os.path.dirname(f), "result.json")
    res = json.load(open(rp)) if os.path.exists(rp) else {}
    cost_total += res.get("total_cost_usd") or 0.0
    for mu in (res.get("modelUsage") or {}).values():
        model_cost_total += mu.get("costUSD") or 0.0
    if res.get("num_turns") is not None:
        turns[arm].append(res["num_turns"])

    if arm in LEAN_ARMS:
        if "--tools" not in argv or argv[argv.index("--tools") + 1] != "Read,Grep,Glob,Bash,Edit":
            fail.append(f"{m['run_id']}: --tools allowlist missing from argv")
    else:
        if "--tools" in argv:
            fail.append(f"{m['run_id']}: unexpected --tools on {arm}")
    if "--disallowedTools" not in argv:
        fail.append(f"{m['run_id']}: --disallowedTools Agent missing")
    want_model = "claude-haiku-4-5" if arm in HAIKU_ARMS else "claude-sonnet-5"
    got = argv[argv.index("--model") + 1]
    if got != want_model:
        fail.append(f"{m['run_id']}: model {got} != {want_model}")
    if arm in HAIKU_ARMS and m["env"].get("effort") != "high":
        fail.append(f"{m['run_id']}: haiku arm should carry the harness default effort")
    if arm not in HAIKU_ARMS and m["env"].get("effort") != "low":
        fail.append(f"{m['run_id']}: sonnet lean arm should carry effort=low")
    if res.get("subtype") != "success":
        fail.append(f"{m['run_id']}: subtype {res.get('subtype')}")

    # Tool calls actually made, straight out of the JSONL transcript.
    jl = os.path.join(os.path.dirname(f), "transcript.jsonl")
    if os.path.exists(jl):
        for line in open(jl, errors="replace"):
            for name in re.findall(r'"type"\s*:\s*"tool_use"\s*,\s*"[^"]*"\s*:\s*"[^"]*"\s*,\s*"name"\s*:\s*"([^"]+)"', line):
                tool_use[arm][name] += 1
            try:
                ev = json.loads(line)
            except Exception:
                continue
            msg = ev.get("message") or {}
            for c in msg.get("content") or []:
                if isinstance(c, dict) and c.get("type") == "tool_use":
                    tool_use[arm][c.get("name")] += 1

print("\nper-arm run counts:")
for a in ARMS:
    check(len(by_arm[a]) == 45, f"{a}: 45 runs (got {len(by_arm[a])})")

print("\ntool calls seen in transcripts (main session):")
for a in ARMS:
    counts = tool_use[a]
    tot = sum(counts.values())
    print(f"  {a}: {tot} calls  {dict(counts.most_common(12))}")
    if a in LEAN_ARMS:
        outside = {k: v for k, v in counts.items() if k not in ALLOWED and not k.startswith("mcp__")}
        check(not outside, f"{a}: no tool_use outside the allowlist (saw {outside})")
    check(counts.get("Agent", 0) == 0 and counts.get("Task", 0) == 0, f"{a}: no Agent/Task tool_use")

print("\nmedian turns:")
for a in ARMS:
    t = sorted(turns[a])
    print(f"  {a}: median {t[len(t)//2] if t else '-'}  mean {sum(t)/len(t):.1f}" if t else f"  {a}: none")

print(f"\ncost reconciliation: total_cost_usd sum ${cost_total:.4f} vs modelUsage sum ${model_cost_total:.4f}")
check(abs(cost_total - model_cost_total) < 0.01, "total_cost_usd reconciles with modelUsage")

print("\nsecrets scan over run metadata:")
pat = re.compile(r"sk-ant-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----")
hits = []
for f in metas:
    if pat.search(open(f, errors="replace").read()):
        hits.append(f)
check(not hits, f"no credential-shaped strings in run.meta.json ({len(hits)} hits)")

print()
if fail:
    print(f"SANITY FAILED ({len(fail)}):")
    for f in fail[:40]:
        print("  -", f)
    sys.exit(1)
print("SANITY OK")
