/**
 * Builds the daily digest bundle per recipient from unread notifications inside the org's digest window.
 *
 * Must call (do not reimplement): isEnabled, renderEmail
 */
import { isEnabled } from "@/lib/feature-flags";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import { renderEmail } from "./email-service";
import { buildFlagContext } from "./feature-flag-service";
import type { RenderedEmail } from "@/server/services/email-service";
import type { IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { User } from "@/types/member";
import type { DigestBundle, DigestEntry } from "@/types/notification";

/** A digest with fewer entries than this is not worth an email. */
const MIN_ENTRIES = 1;

/**
 * Collects one recipient's unread notifications inside the window. Returns
 * `null` — rather than an empty bundle — when the org's plan does not include
 * the digest, or when there is nothing to say: the caller treats `null` as
 * "send nothing", so a quiet day produces no mail at all.
 */
export async function buildDigest(
  orgId: OrgId,
  recipientId: UserId,
  windowStart: IsoTimestamp,
  windowEnd: IsoTimestamp,
): Promise<DigestBundle | null> {
  const org = await orgRepo.findOrgById(orgId);
  if (!org) return null;

  if (!isEnabled("digest_email", buildFlagContext(null, org))) return null;

  const unread = await notificationRepo.listUnreadSince(
    orgId,
    recipientId,
    windowStart,
  );

  const entries: DigestEntry[] = unread
    .filter((notification) => notification.createdAt <= windowEnd)
    .map((notification) => ({
      notificationId: notification.id,
      kind: notification.kind,
      title: notification.title,
      href: notification.href,
      occurredAt: notification.createdAt,
    }));

  if (entries.length < MIN_ENTRIES) return null;

  return { orgId, recipientId, entries, windowStart, windowEnd };
}

/**
 * Who gets a digest: everyone who set at least one notification kind to
 * `digestOnly`. Opting into the digest is what suppresses the immediate
 * emails, so the two lists are two views of the same preference.
 */
export async function listDigestRecipients(
  orgId: OrgId,
): Promise<readonly UserId[]> {
  return preferenceRepo.listDigestSubscribers(orgId);
}

/** Renders one bundle through the shared email pipeline. */
export async function renderDigest(
  bundle: DigestBundle,
  recipient: User,
): Promise<RenderedEmail> {
  return renderEmail("digest", {
    orgId: bundle.orgId,
    recipientName: recipient.name,
    entryCount: bundle.entries.length,
    windowStart: bundle.windowStart,
    windowEnd: bundle.windowEnd,
    headline: bundle.entries[0]?.title ?? "",
  });
}
