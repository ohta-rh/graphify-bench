# overlays/baseline

Overlay for condition **A (baseline)**. Contains only `CLAUDE.md`, holding the
instruction text shared by both conditions (working rules + the answer format
contract used by the graders). It must never mention graphify.

`--setting-sources project` keeps the user-level `~/.claude/` skills and CLAUDE.md
out of the run, so this file is the entire project instruction surface.
