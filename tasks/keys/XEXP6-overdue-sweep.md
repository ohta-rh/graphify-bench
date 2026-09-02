# Rubric — how a past-due issue turns into an alert, once

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **The trigger, and that it holds no logic.** `POST` on
   `src/app/api/cron/overdue/route.ts` authenticates with `assertCronSecret`
   and calls `runOverdueIssueJob(new Date())`; its own header notes that the
   job emits and the notification fan-out is a subscriber, so the route never
   sends anything itself. Award the point for the Route Handler being a thin
   authenticated trigger delegating to the job.

2. **What the sweep selects.** `runOverdueIssueJob` in
   `src/server/jobs/overdue-issue-job.ts` runs inside `runJob("overdue-issues", …)`,
   takes a batch of organizations from `usageRepository.listOrgIdsForRollup(ORG_BATCH)`
   (50), and per org asks `issueRepository.listOverdueIssues(orgId, stamp)`
   for still-open issues whose `dueAt` has passed; an issue with no due date is
   skipped, and archived issues are excluded — the job asserts
   `shouldFilterArchived(LIVE_ONLY)` up front and bails out with a warning if
   that ever stops being true, because an archived issue has no due date.
   Award the point for the open + past-due + not-archived selection.

3. **The job announces a fact; it owns no notification logic.** For each
   selected issue it calls `emit("issue.overdue", …)` on the bus with
   `issueId`, `projectId`, `dueAt` and `assigneeId` (and a `null` actor, since
   nobody performed this action). Failures are caught per issue, counted into
   the `JobResult` and logged, so one bad row does not abort the sweep. Award
   the point for the job publishing an event rather than notifying anyone, and
   for the per-issue error isolation.

4. **Why the same issue is not alerted every pass.** A module-level `reported`
   `Set` records issue ids already announced for this process's lifetime, and
   the loop skips ids already in it; `resetOverdueTracking()` exists so a test
   can start clean. A later sweep still finds the same still-open, still-overdue
   issue, so without that set the cron would re-alert on every tick. Note the
   scope: the set is in-process, so it does not survive a restart. Award the
   point for the in-memory dedup being what makes the alert once-per-issue.

5. **Who reacts, and how the recipient is chosen.** The notification fan-out in
   `src/server/services/notification-service.ts` — attached at module import
   rather than through `event-registry`, because it has no `register*` entry
   point of its own — subscribes to `issue.overdue`, returns immediately when
   `assigneeId` is `null`, and otherwise calls `notify(orgId, "issue_overdue",
   [assigneeId], …)`. `notify` skips a recipient equal to the payload's actor,
   reads that person's per-kind preference and passes it to `resolveChannels`,
   which yields `in_app` and/or `email` (email additionally requiring the
   `digest_email` flag when the preference is `digestOnly`), and writes nothing
   at all for a recipient who has muted every channel. Award the point for the
   unassigned-issue short circuit or for preferences deciding the channels.
