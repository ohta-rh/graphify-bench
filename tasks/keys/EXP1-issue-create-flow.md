# Rubric — issue creation, form submission to fan-out

Five elements, one point each. The grader has not seen the codebase; everything
needed to judge is stated here. Award the point when the answer conveys the
substance, even if it words it differently or names extra files alongside.
Do **not** award a point for merely naming a file without the behaviour.

1. **The Server Action entry point and its wrapper.** The submission is handled
   by `createIssueAction` in `src/actions/issues/create-issue.ts`, which is
   built with `withAction` from `src/actions/_lib/with-action.ts`. The wrapper
   is what parses the payload with a Zod schema (`createIssueSchema`), resolves
   the `Actor`, maps thrown domain errors onto an `ActionResult`, and
   revalidates cache tags. Award the point if the answer identifies the action
   file and that a shared wrapper does validation + actor resolution + error
   mapping around it.

2. **The permission check.** Authorization goes through the single entry point
   in `src/lib/permissions.ts`: the action calls the boolean `can(actor,
   "issue:create", ...)` and the service calls the throwing `assertCan(...)`
   with the same action. The decision itself is a role-rank lookup in
   `ROLE_MATRIX` preceded by a cross-tenant guard. Award the point for naming
   `can` / `assertCan` (or `src/lib/permissions.ts`) as the gate and the
   `issue:create` action string or the role-matrix mechanism.

3. **The service-layer gates, in order.** `createIssue` in
   `src/server/services/issue-service.ts` runs four gates before writing:
   tenant scope (`assertOrgScope` from `src/lib/tenant.ts`), a live parent
   project (`findProjectById` + `assertNotArchived` from
   `src/lib/soft-delete.ts`), the `issue:create` permission, and the
   per-project issue quota via `wouldExceedLimit(plan, "issuesPerProject", ...)`
   reading `src/config/plan-limits.ts`. Award the point if the answer names the
   service function and at least three of these four gates.

4. **The database write.** After the gates, the service allocates a per-project
   issue number (`nextIssueNumber`) and calls `insertIssue` in
   `src/server/repositories/issue-repository.ts`, which performs the Drizzle
   insert into the `issues` table and, when labels were supplied, a second
   insert into `issueLabels`. Award the point for the repository layer doing
   the insert and for the number allocation preceding it.

5. **The event and its consequences.** The service then publishes
   `emit("issue.created", ...)` on the in-process bus in
   `src/lib/event-bus.ts`, and everything reactive hangs off that rather than
   off the action: subscribers in `activity-service.ts` (audit log),
   `search-service.ts` (reindex), `usage-service.ts` (usage counters) and
   `webhook-service.ts` (outbound delivery). Handlers are isolated — one
   throwing handler does not fail the emit. Award the point if the answer
   identifies the event bus hop AND names at least two of the four reacting
   concerns. Do not award it for "an event is emitted" with no consumers.
