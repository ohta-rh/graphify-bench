#!/usr/bin/env python3
"""Flag benchmark runs whose agent reached outside its own working copy.

Every run executes in a private clone under `<tmp>/bench-scratch/<uuid>/`. The
filesystem is not sandboxed, so an agent *could* read this repository's
`tasks/*/solution.patch`, the hidden specs, or another run's directory. This
audit reads each transcript's tool inputs and reports:

  - absolute paths that are neither inside the run's own clone nor an ordinary
    system/toolchain location, and
  - any mention of the benchmark's own artefacts (repository name, hidden
    specs, reference solutions, bug patches, answer keys).

Files the agent itself writes under /tmp, and Claude Code's own persisted
tool output for the run's session, are counted separately and are not a
violation: they are the agent's own scratch and output, not a route to the answer.

The run's own clone is inferred as the most frequent `bench-scratch/<uuid>`
prefix in its transcript. Output is one line per flagged tool call; exit status
is 1 when anything is flagged, so a measurement set can be gated on it.

Usage: scripts/audit-scope.py results/ultra/runs [results/hard/runs ...]
"""
import collections
import glob
import json
import re
import sys

SCRATCH = re.compile(r"bench-scratch/([0-9a-f-]{36})")
# Claude Code persists an oversized tool result under the run's own session
# directory and tells the agent where; reading it back is reading its own output.
OWN_SESSION_OUTPUT = re.compile(r"/\.claude/projects/[^/]*bench-scratch-([0-9a-f-]{36})/\1/tool-results/")
ABS = re.compile(r"(?<![\w.~-])(/(?:Users|home|private|var|tmp|Volumes|opt|etc)/[^\s'\"`;|&)]*)")
ALLOWED_PREFIXES = (
    "/opt/homebrew/",  # toolchain binaries
    "/usr/",
    "/bin/",
    "/etc/hosts",
    "/tmp/vitest",
    "/dev/null",
)
LEAK = re.compile(
    r"graphify-bench|solution\.patch|naive2?\.patch|bug\.patch|hidden\.test|tests/hidden|"
    r"tasks-(?:hard|ultra)|tasks/(?:hard|ultra|keys)|VALIDATION\.md",
    re.I,
)


def tool_inputs(transcript):
    for line in open(transcript, encoding="utf-8"):
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("type") != "assistant":
            continue
        for block in entry.get("message", {}).get("content", []) or []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                yield block.get("name", "?"), json.dumps(block.get("input", {}), ensure_ascii=False)


def audit_run(transcript):
    calls = list(tool_inputs(transcript))
    own = collections.Counter(m for _, s in calls for m in SCRATCH.findall(s))
    own_id = own.most_common(1)[0][0] if own else None
    flagged = []
    notes = []
    for name, text in calls:
        reasons = []
        if LEAK.search(text):
            reasons.append("benchmark-artefact:" + LEAK.search(text).group(0))
        for path in ABS.findall(text):
            path = path.rstrip("\\")  # JSON escaping can leave a trailing backslash
            if OWN_SESSION_OUTPUT.search(path):
                notes.append("own-session-output")
                continue
            if own_id and own_id in path:
                continue
            if path.startswith(ALLOWED_PREFIXES):
                continue
            if path in ("/tmp", "/private/tmp") or path.startswith(("/tmp/", "/private/tmp/")):
                notes.append("tmp-scratch:" + path[:80])  # agent's own scratch file, not a leak
                continue
            m = SCRATCH.search(path)
            if m and own_id is None:
                continue  # cannot tell whose clone it is; the agent only ever saw its own cwd
            reasons.append("outside-clone:" + path[:120])
        if reasons:
            flagged.append((name, reasons, text[:200]))
    return flagged, notes


def main(dirs):
    total = bad = scratch = 0
    for d in dirs:
        for transcript in sorted(glob.glob(f"{d}/*/transcript.jsonl")):
            total += 1
            flagged, notes = audit_run(transcript)
            scratch += bool(notes)
            if flagged:
                bad += 1
                run = transcript.split("/")[-2]
                for name, reasons, text in flagged:
                    print(f"{run}\t{name}\t{'; '.join(reasons)}\t{text}")
    print(f"# audited {total} runs, {bad} flagged, {scratch} used their own /tmp scratch or persisted session output", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["results/hard/runs"]))
