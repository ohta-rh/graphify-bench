/**
 * Attachment metadata plus the storage quota guard.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, wouldExceedLimit
 */
import { wouldExceedLimit } from "@/config/plan-limits";
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as attachmentRepo from "@/server/repositories/attachment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { issueResource, requireFound } from "./_support";
import type {
  CreateAttachmentInput,
  DeleteAttachmentInput,
} from "@/schemas/attachment";
import type { IssueId, OrgId } from "@/types/common";
import type { IssueAttachment } from "@/types/issue";
import type { Actor } from "@/types/member";

const BYTES_PER_MB = 1024 * 1024;

export async function listAttachments(
  actor: Actor,
  orgId: OrgId,
  issueId: IssueId,
): Promise<readonly IssueAttachment[]> {
  assertOrgScope(actor, orgId);

  const issue = requireFound(
    await issueRepo.findIssueById(orgId, issueId),
    "Issue",
    issueId,
  );
  assertCan(actor, "issue:read", issueResource(issue));

  return attachmentRepo.listAttachments(orgId, issueId);
}

/**
 * Records an upload after checking the org still has storage left. The quota
 * is in megabytes and the upload is in bytes, so the incoming size is rounded
 * up to whole megabytes before the comparison — half a megabyte still costs
 * one against the plan.
 */
export async function addAttachment(
  actor: Actor,
  input: CreateAttachmentInput,
): Promise<IssueAttachment> {
  assertOrgScope(actor, input.orgId);

  const issue = requireFound(
    await issueRepo.findIssueById(input.orgId, input.issueId),
    "Issue",
    input.issueId,
  );
  assertCan(actor, "issue:update", issueResource(issue));

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );

  const usage = await usageRepo.getUsage(input.orgId);
  const requestedMb = Math.ceil(input.sizeBytes / BYTES_PER_MB);

  if (
    wouldExceedLimit(org.plan, "storageMb", usage.storageMbUsed, requestedMb)
  ) {
    throw new Error(
      `Plan ${org.plan} has no room for another ${requestedMb} MB`,
    );
  }

  const attachment = await attachmentRepo.insertAttachment(
    input,
    actor.userId,
  );
  await usageRepo.incrementUsage(input.orgId, { storageMbUsed: requestedMb });

  return attachment;
}

/** Removing an attachment gives the megabytes back to the quota. */
export async function removeAttachment(
  actor: Actor,
  input: DeleteAttachmentInput,
): Promise<void> {
  assertOrgScope(actor, input.orgId);

  const attachment = requireFound(
    await findAttachment(input.orgId, input.attachmentId),
    "Attachment",
    input.attachmentId,
  );

  const issue = requireFound(
    await issueRepo.findIssueById(input.orgId, attachment.issueId),
    "Issue",
    attachment.issueId,
  );
  assertCan(actor, "issue:update", issueResource(issue));

  await attachmentRepo.deleteAttachment(input.orgId, input.attachmentId);
  await usageRepo.incrementUsage(input.orgId, {
    storageMbUsed: -Math.ceil(attachment.sizeBytes / BYTES_PER_MB),
  });
}

/**
 * The attachment repository only reads by issue, because that is the only way
 * the UI ever reaches one. A delete arrives with just an id, so the org's
 * issues are walked until the row turns up.
 */
async function findAttachment(
  orgId: OrgId,
  attachmentId: string,
): Promise<IssueAttachment | null> {
  const page = await issueRepo.listIssues({
    orgId,
    limit: 100,
    cursor: null,
    includeArchived: true,
  });

  for (const issue of page.items) {
    const rows = await attachmentRepo.listAttachments(orgId, issue.id);
    const match = rows.find((row) => row.id === attachmentId);
    if (match) return match;
  }

  return null;
}
