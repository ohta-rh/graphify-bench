# overlays/few-turns

Overlay for the `few-turns` arm (Phase 12). `CLAUDE.md` is `overlays/baseline`'s
file **byte for byte**, plus one appended `## Working economy` section.

The arm isolates *turn count*: everything the appended section asks for —
`Grep -n` before reading, `Read` with `offset`/`limit`, batching independent tool
calls into one turn, never re-reading, stopping when the evidence suffices — is a
statement about how the agent spends turns, not about what it should answer. The
answer-format contract is untouched, which is what makes the arm comparable with
every other arm on the same graders.
