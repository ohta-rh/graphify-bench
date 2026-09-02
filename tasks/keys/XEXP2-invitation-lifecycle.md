# Rubric — from "invite a teammate" to a member row

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **The Server Action and its shared wrapper.** `inviteMemberAction` in
   `src/actions/members/invite-member.ts` runs through `withAction()`
   (`src/actions/_lib/with-action.ts`), which is what parses the payload with
   `inviteMemberSchema`, resolves the `Actor` (`getActor(orgSlug)` or
   `requireActorFor(orgId)`), maps thrown domain errors through
   `toActionResult`, and revalidates the cache tags. Award the point for the
   action delegating validate/authenticate/translate/revalidate to that one
   wrapper rather than doing it itself.

2. **The gates are applied twice, on purpose.** The action itself checks
   `can(actor, "member:invite", …)`, charges the `member:invite` token bucket
   via `consumeRateLimit`, and compares `summary.usage.seatsUsed + 1` against
   `getPlanLimits(plan).seats`; then `inviteMembers()` in
   `src/server/services/invitation-service.ts` re-runs the same three as
   `assertOrgScope` + `assertCan`, `consumeRateLimit` (charged
   `input.invites.length` for a batch) and `wouldExceedLimit(plan, "seats", …)`.
   Award the point for noticing the action layer and the service layer both
   enforce the quota/permission/rate limit — the service is the authority, the
   action is what turns a refusal into a typed `PlanLimitError` /
   `RateLimitedError` / `ForbiddenActionError` for the form.

3. **Pending invitations count as seats, and a batch is all-or-nothing.**
   `seatsUsed` is `memberRepository.countActiveMembers` **plus**
   `invitationRepository.countPendingInvitations`, so an org cannot queue
   fifty invitations past a three-seat plan; and the quota is evaluated once
   for the whole batch before any row is written, so inviting five people into
   three free seats fails as a batch rather than half-succeeding. Award the
   point for either the pending-invitations-count-as-seats rule or the
   batch-checked-once rule; both is a bonus.

4. **What is stored, and what is emailed.** Per invite, `randomToken(32)`
   mints the raw token and only `hashToken(token)` reaches
   `invitationRepository.insertInvitation` (together with the role and
   `DEFAULT_EXPIRY_DAYS` = 14), so the database cannot be replayed as an
   invitation; the raw token exists only in the link. Each invite then emits
   `member.invited` with the email and role. Award the point for the token
   being stored hashed while the raw value travels in the link/email.

5. **Acceptance runs unauthenticated and ends in `member.joined`.**
   `acceptInvitation(userId, input)` looks the row up by
   `hashToken(input.token)` — the token *is* the credential, so there is no
   `Actor` and every check comes off the stored row: revoked (`revokedAt`),
   already used (`acceptedAt`), expired (`expiresAt` vs now). An existing
   membership short-circuits and is returned as-is (accepting twice is
   idempotent). Otherwise `memberRepository.insertMember` writes the row,
   `markInvitationAccepted` stamps the invitation, and `emit("member.joined", …)`
   fires — which the notification fan-out in `notification-service.ts` turns
   into a notice to the org owner and `usage-service` counts as a seat. Award
   the point for the token-as-credential acceptance path plus `member.joined`
   being what tells the rest of the system.
