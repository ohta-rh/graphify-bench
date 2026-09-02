# Rubric — `@handle` in a comment becomes a notification

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **Handle extraction and resolution.** `src/lib/mentions.ts` parses the
   comment body: `extractMentions` finds `@handle` occurrences with a regex
   that skips code spans and fenced blocks, and `resolveMentions` maps each
   handle onto a real `UserId`. A handle is the lowercased local part of the
   member's email address (`handleOf`), and unknown handles are silently
   dropped so a typo never fails the write. Award the point for the extraction
   + resolution split and the email-local-part rule or the silent-drop rule.

2. **The service that owns the write.** `createComment` in
   `src/server/services/comment-service.ts` runs the gates
   (`assertOrgScope`, a live parent issue via `findIssueById` plus
   `assertNotArchived`, and `assertCan(actor, "comment:create", ...)`), resolves
   the mentioned users against the organization's members, and persists the
   comment through `src/server/repositories/comment-repository.ts` with the
   resolved id list stored on the row. Award the point for the service doing
   resolution before the insert.

3. **The event carries the resolved list forward.** The service emits
   `comment.created` on the bus in `src/lib/event-bus.ts` with a
   `mentionedUserIds` field on the payload. The notification side reads that
   list rather than re-parsing the markdown, so the stored row and the
   notification agree on who was mentioned. Award the point for the event hop
   AND for the payload carrying the already-resolved ids.

4. **The fan-out subscriber.** `src/server/services/notification-service.ts`
   subscribes to `comment.created` and calls `notify(...)` twice: once with
   kind `comment_created` for the issue's watchers (author plus assignee), and
   again with kind `comment_mention` for the mentioned users when the list is
   non-empty. Notable wiring detail: this fan-out attaches at module load
   (`registerFanOut()` runs on import) rather than being registered from
   `src/server/services/event-registry.ts` like the other subscriber groups.
   Award the point for the subscriber producing a separate mention
   notification; the module-load wiring detail is a bonus, not required.

5. **What decides in-app vs email vs nothing.** Inside `notify`, the actor is
   skipped (you are never notified of your own comment), and for each remaining
   recipient the stored preference is read from
   `notification-preference-repository.ts` and passed to `resolveChannels`.
   That function returns the default `["in_app", "email"]` when no preference
   exists; otherwise `inApp` adds the in-app channel, and the email channel
   additionally requires that the recipient is not `digestOnly` — or that the
   org's `digest_email` feature flag is on (`isEnabled` from
   `src/lib/feature-flags.ts`). A recipient whose channel set comes out empty
   is skipped entirely rather than given a row nobody will see. Award the point
   for per-recipient preference lookup producing the channel set AND at least
   one of: the self-notification skip, the `digestOnly` rule, or the
   empty-channel skip.
