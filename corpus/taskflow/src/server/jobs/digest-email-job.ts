/**
 * Builds and 'sends' the daily digest for every subscriber of every org whose digest hour has arrived.
 *
 * Must call (do not reimplement): isEnabled, buildDigest, sendEmail
 */
import { isEnabled } from "@/lib/feature-flags";
import { createLogger } from "@/lib/logger";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { buildDigest, listDigestRecipients, renderDigest } from "@/server/services/digest-service";
import { sendEmail } from "@/server/services/email-service";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { toIsoTimestamp } from "@/types/common";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";
import type { Organization } from "@/types/organization";

const ORG_BATCH = 50;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const logger = createLogger("digest-email-job");

/**
 * One pass per scheduler tick. Each org is only processed during the UTC hour
 * it configured, so a tick that runs every few minutes still sends exactly one
 * digest per day per recipient.
 */
export async function runDigestEmailJob(now: Date): Promise<JobResult> {
  return runJob("digest-email", async (result) => {
    const orgIds = await usageRepo.listOrgIdsForRollup(ORG_BATCH);

    for (const orgId of orgIds) {
      const org = await orgRepo.findOrgById(orgId);
      if (!org || !shouldRunForOrg(org, now)) continue;

      if (!isEnabled("digest_email", buildFlagContext(null, org))) continue;

      const windowEnd = toIsoTimestamp(now);
      const windowStart = toIsoTimestamp(new Date(now.getTime() - MS_PER_DAY));

      for (const recipientId of await listDigestRecipients(orgId)) {
        try {
          const bundle = await buildDigest(
            orgId,
            recipientId,
            windowStart,
            windowEnd,
          );
          if (!bundle) continue;

          const recipient = await userRepo.findUserById(recipientId);
          if (!recipient) continue;

          const rendered = await renderDigest(bundle, recipient);
          await sendEmail({ to: recipient.email, ...rendered });

          // Once digested, these notifications are no longer "unread" — this
          // is what keeps a later run inside the same window from sending
          // the same digest twice.
          for (const entry of bundle.entries) {
            await notificationRepo.markRead(orgId, entry.notificationId, windowEnd);
          }

          result.processed += 1;
        } catch (error) {
          result.failed += 1;
          logger.error("digest failed", {
            orgId,
            recipientId,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  });
}

/**
 * True during the org's configured digest hour. Exported because the schedule
 * decision is worth testing on its own, without a database.
 */
export function shouldRunForOrg(org: Organization, now: Date): boolean {
  if (org.archivedAt !== null) return false;
  return now.getUTCHours() === org.settings.digestHourUtc;
}
