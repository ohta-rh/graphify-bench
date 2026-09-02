/**
 * Builds the daily digest bundle per recipient from unread notifications inside the org's digest window.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled, renderEmail
 */
import type { RenderedEmail } from "@/server/services/email-service";
import type { IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { User } from "@/types/member";
import type { DigestBundle } from "@/types/notification";
export async function buildDigest(orgId: OrgId, recipientId: UserId, windowStart: IsoTimestamp, windowEnd: IsoTimestamp): Promise<DigestBundle | null> {
  throw new Error("stub: src/server/services/digest-service.ts");
}

export async function listDigestRecipients(orgId: OrgId): Promise<readonly UserId[]> {
  throw new Error("stub: src/server/services/digest-service.ts");
}

export async function renderDigest(bundle: DigestBundle, recipient: User): Promise<RenderedEmail> {
  throw new Error("stub: src/server/services/digest-service.ts");
}
