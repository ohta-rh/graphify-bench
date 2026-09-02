# Rubric — how one workspace comes to receive a daily digest

Five elements, one point each. The grader has not seen the codebase or the
documentation; everything needed to judge is stated here. Award the point when
the answer conveys the substance, even if worded differently. Do **not** award a
point for naming a document or file without the behaviour it carries.

1. **The governing documents.** The requirement lives in
   `corpus/taskflow/docs/requirements/notifications-and-digests.md`; the design
   is `docs/design/service-digest-and-email.md` for the digest assembly and
   `docs/design/background-jobs.md` for the scheduling, and the decision beneath
   them is `docs/adr/ADR-016-interval-scheduler.md` (an in-process interval
   scheduler rather than an external cron system), with
   `docs/adr/ADR-012-feature-flag-strategies.md` behind the flag gate. Award the
   point for reaching the requirement plus at least one design document and the
   scheduler ADR.

2. **What decides the job is due.** `src/server/jobs/scheduler.ts` runs `tick(now)`
   on a `TICK_INTERVAL_MS` of 60,000 ms and consults
   `CADENCE_MINUTES`, a `Record<JobKind, number>` in which `"digest-email"` is
   **60** — so the digest job becomes eligible once an hour, not once a day.
   `isDue(kind, now)` compares against `lastRunAt`, and a due kind is
   `enqueue`d and then `drain`ed. Award the point for naming the scheduler, the
   cadence table, and the hourly eligibility of the digest job.

3. **What decides the job is due for that particular workspace.**
   `runDigestEmailJob(now)` in `src/server/jobs/digest-email-job.ts` iterates
   organizations and skips each one unless
   `shouldRunForOrg(org, now)` returns true, which is
   `org.archivedAt === null && now.getUTCHours() === org.settings.digestHourUtc`.
   That per-organization UTC hour — column `digest_hour_utc`, default 7 — is
   what makes delivery daily per recipient. The job additionally skips the org
   unless `isEnabled("digest_email", buildFlagContext(null, org))`. Award the
   point for the per-org hour check being the daily mechanism, and for the flag
   gate being a second, separate condition.

4. **The two mechanisms are different, and the requirement conflates them.**
   Eligibility (hourly, from the cadence table) and per-workspace delivery
   (daily, from the hour match) are distinct. The requirements document states
   the digest job runs on a `digest-email` cadence of **1440 minutes, i.e. once
   a day** — that is wrong: 1440 is the cadence of `search-reindex` and
   `cleanup-archived`, not of `digest-email`, whose cadence is 60. Award the
   point for stating plainly that the documented cadence number does not match
   the code, and for attributing the daily behaviour to `shouldRunForOrg` rather
   than to the cadence.

5. **What the job then does, and what verifies it.** For each due org the job
   takes a 24-hour window (`windowStart` = now − `MS_PER_DAY`), lists digest
   recipients, calls `buildDigest(orgId, recipientId, windowStart, windowEnd)`,
   renders it and calls `sendEmail`, then marks the digested notifications so a
   later run inside the same window does not resend them; it processes at most
   `ORG_BATCH` (50) organizations per pass. The verifying specs are
   `tests/jobs/digest-email-job.test.ts` and `tests/server/jobs.test.ts`. Award
   the point for the window-plus-recipients assembly and at least one named
   spec; the exact batch size is a bonus.
