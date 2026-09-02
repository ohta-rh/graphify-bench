# Rubric — the daily digest email pipeline

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **The trigger, and that it is only a trigger.** `POST` on
   `src/app/api/cron/digest/route.ts` authenticates with `assertCronSecret`
   and calls `runDigestEmailJob(new Date())`. The route holds no scheduling
   logic of its own: the job decides which organizations are due, which is why
   calling the route hourly is correct and calling it twice in an hour is
   harmless. Award the point for identifying the Route Handler as a thin
   trigger delegating to the job.

2. **Which organizations are due right now.** `runDigestEmailJob` in
   `src/server/jobs/digest-email-job.ts` takes a batch of organization ids and
   filters them through `shouldRunForOrg(org, now)`, which returns false for an
   archived organization and otherwise requires
   `now.getUTCHours() === org.settings.digestHourUtc`. That per-org configured
   UTC hour is what makes a scheduler that ticks every few minutes still send
   exactly one digest per recipient per day. Award the point for the
   digest-hour comparison being the due-organization rule.

3. **Who inside the organization is subscribed.** `listDigestRecipients` in
   `src/server/services/digest-service.ts` delegates to the notification
   preference repository's `listDigestSubscribers`: the recipients are the
   people who set at least one notification kind to `digestOnly`. Opting into
   the digest is the same preference that suppresses their immediate emails, so
   the subscriber list and the muted-immediate-email list are two views of one
   setting. Award the point for the `digestOnly` preference defining
   subscription; the "two views of one setting" observation is a bonus.

4. **How one person's digest is assembled.** `buildDigest(orgId, recipientId,
   windowStart, windowEnd)` in `digest-service.ts` reads that recipient's
   unread notifications since `windowStart` (`listUnreadSince`), keeps the ones
   whose `createdAt` falls at or before `windowEnd`, and maps them to
   `DigestEntry` records. The window is the trailing 24 hours, computed in the
   job as `now` minus one day. The bundle is then rendered through the shared
   email pipeline (`renderDigest` → `renderEmail` in `email-service.ts`, with
   the template in `src/emails/digest-email.tsx`) and handed to `sendEmail`.
   Award the point for the digest being assembled from the recipient's *unread
   notifications* inside a time window — not re-derived from issues or activity.

5. **The ways a subscribed person still gets nothing.** There are three
   distinct short circuits, and `buildDigest` returns `null` rather than an
   empty bundle so the caller reads `null` as "send nothing":
   (a) the organization's hour has not arrived, or the org is archived
   (`shouldRunForOrg`);
   (b) the `digest_email` feature flag is not enabled for the organization's
   plan — checked both in the job and again inside `buildDigest` via
   `isEnabled` / `buildFlagContext`;
   (c) the window produced no entries at all, so a quiet day produces no mail.
   A per-recipient failure is caught, counted in the job result and logged,
   without aborting the rest of the run. Award the point for at least two of
   (a), (b), (c) being identified as reasons no email is sent.
